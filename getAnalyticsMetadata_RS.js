/*
Copyright (c) 2026 Solenex Technology Pvt Ltd. (All Rights Reserved)

Licensed under the MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */
define(['N/dataset', 'N/search'], (dataset, search) => {

    const get = (context) => {
        try {
            const reportid = context.analyticsreportid;                                         // dataset or saved search id in NetSuite
            const pagestoLoad = context.pagestoload ? parseInt(context.pagestoload) : null;     // number of pages to return for the request

            log.debug('reportid', reportid);
            log.debug('pagestoLoad', pagestoLoad);

            if (!pagestoLoad) {
                return { "error": "MISSING_PAGESTOLOAD", "message": "The pagestoload parameter is required" };
            }

            if (reportid.indexOf('customsearch') != -1) {
                log.debug({ title: "Metadata", details: "Fetching for Saved Search" });
                return getSavedsearchMetadata(reportid, pagestoLoad);
            } else if (reportid.indexOf('custdataset') != -1) {
                log.debug({ title: "Metadata", details: "Fetching for Dataset" });
                return getDatasetMetadata(reportid, pagestoLoad);
            } else {
                return { "error": "INVALID_REPORTID", "message": "The dataset/saved search id is invalid" };
            }
        } catch (e) {
            log.error({ title: 'error in get()', details: JSON.stringify(e) });
            return e;
        }
    };

    const getDatasetMetadata = (reportid, pagestoLoad) => {
        const report = dataset.load({
            id: reportid
        });
        const pagedData = report.runPaged({
            pageSize: 1000
        });
        const totalPages = pagedData.pageRanges.length;

        // Compute custom pages where end users page size & dataset page size may differ
        // Dataset page size is max 1000, which is currently being used
        // pagestoLoad to load is custom page size which sets the number of dataset pages to process as a single o/p page
        const additionalPage = totalPages % pagestoLoad > 0 ? 1 : 0;
        const computedPages = parseInt(parseInt(totalPages / pagestoLoad) + additionalPage);
        const totalrows = pagedData.count;

        // logging for debugging purpose
        log.debug({ title: 'pagestoLoad', details: pagestoLoad });
        log.debug({ title: 'totalPages', details: totalPages });
        log.debug({ title: 'computedPages', details: computedPages });
        log.debug({ title: 'totalrows', details: totalrows });

        return {
            "analyticsname": report.name,
            "analyticstype": report.type,
            "totalrows": totalrows,
            "totalpages": computedPages,
            "pageindexrange": `0-${(computedPages - 1)}`
        };
    };

    const getSavedsearchMetadata = (reportid, pagestoLoad) => {
        const report = search.load({
            id: reportid
        });
        const pagedData = report.runPaged({
            pageSize: 1000
        });
        const totalPages = pagedData.pageRanges.length;

        // Compute custom pages where end users page size & dataset page size may differ
        // datasetpage size is max 1000, which is currently being used
        // pagestoLoad to load is custom page size which sets the number of dataset pages to process as a single o/p page
        const additionalPage = totalPages % pagestoLoad > 0 ? 1 : 0;
        const computedPages = parseInt(parseInt(totalPages / pagestoLoad) + additionalPage);
        const totalrows = pagedData.count;

        // logging for debugging purpose
        log.debug({ title: 'pagestoLoad', details: pagestoLoad });
        log.debug({ title: 'totalPages', details: totalPages });
        log.debug({ title: 'computedPages', details: computedPages });
        log.debug({ title: 'totalrows', details: totalrows });

        return {
            "analyticsname": report.title,
            "analyticstype": report.searchType,
            "totalrows": totalrows,
            "totalpages": computedPages,
            "pageindexrange": `0-${(computedPages - 1)}`
        };
    };

    return { get }
});