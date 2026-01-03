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
            const reportid = context.analyticsreportid;
            const pageIndex = context.pageindex ? parseInt(context.pageindex) : null;
            const pagestoLoad = context.pageindex ? parseInt(context.pagestoload) : null;

            log.debug({ title: 'reportid', details: reportid });
            log.debug({ title: 'pageIndex', details: pageIndex });
            log.debug({ title: 'pagestoLoad', details: pagestoLoad });

            // Perform basic checks
            if (!pageIndex) {
                return { "error": "MISSING_PAGEINDEX", "message": "The pageindex parameter is required" };
            }
            if (!pagestoLoad) {
                return { "error": "MISSING_PAGESTOLOAD", "message": "The pagestoload parameter is required" };
            }

            // Fetch data in multidimensional array; which can be directly pushed to sheets
            if (reportid.indexOf('customsearch') !== -1) {
                log.debug({ title: 'executing saved search', details: reportid });
                return getSavedsearchResults(reportid, pageIndex, pagestoLoad);
            } else if (reportid.indexOf('custdataset') !== -1) {
                log.debug({ title: 'executing dataset', details: reportid });
                return getDatasetResults(reportid, pageIndex, pagestoLoad);
            } else {
                return { "error": "INVALID_REPORTID", "message": "The dataset/saved search id is invalid" };
            }
        } catch (e) {
            log.error({ title: 'error in get', details: JSON.stringify(e) });
            return e;
        }
    };

    const getDatasetResults = (datsetid, pageIndex, pagestoLoad) => {
        let arrayData = [];
        let columnKeys = [];

        // Load & extract dataset values
        const customDataset = dataset.load({ id: datsetid });
        const pagedData = customDataset.runPaged({ pageSize: 1000 });
        const totalPages = pagedData.pageRanges.length;

        // Compute custom pages where end users page size & dataset page size may differ
        // dataset page size is max 1000, which is currently being used
        // pagestoLoad to load is custom page size which sets the number of dataset pages to process as a single o/p page
        const additionalPage = totalPages % pagestoLoad > 0 ? 1 : 0;
        const computedPages = parseInt(parseInt(totalPages / pagestoLoad) + additionalPage);
        const totalrows = pagedData.count;
        log.debug({ title: 'pagestoLoad', details: pagestoLoad });
        log.debug({ title: 'totalPages', details: totalPages });
        log.debug({ title: 'computedPages', details: computedPages });
        log.debug({ title: 'totalrows', details: totalrows });

        const pagestoRun = pageIndex < (computedPages - 1) ? pagestoLoad : (totalPages % pagestoLoad === 0 ? pagestoLoad : totalPages % pagestoLoad);
        log.debug({ title: 'pagestoRun', details: pagestoRun });

        // Loop to run through each computed pages
        for (let i = 0; i < pagestoRun; i++) {
            log.debug({ title: 'current dataset page', details: parseInt(i + (pageIndex * pagestoLoad)) });
            let currentPage = pagedData.fetch(i + (pageIndex * pagestoLoad));
            let results = currentPage.data.results;

            // 1. Extract and sanitize column names from the first page processed
            if (columnKeys.length === 0) {
                columnKeys = currentPage.data.columns.map((col) => {
                    // Ensure label exists, convert to lowercase, and remove all spaces
                    return (col.label || "column").toLowerCase().replace(/\s+/g, '');
                });
            }

            // 2. Process all data rows as objects using columnKeys
            const pageRows = results.map((result) => {
                let rowObject = {};

                // Map each value to its corresponding sanitized column key by index
                result.values.forEach((value, index) => {
                    const key = columnKeys[index];
                    // Ensure the value is converted to a string or empty string if null
                    rowObject[key] = (value !== null && value !== undefined) ? value.toString() : "";
                });

                return rowObject;
            });

            arrayData.push(...pageRows);
        }

        return {
            "analyticsname": customDataset.name,
            "analyticstype": customDataset.type,
            "totalrows": totalrows,
            "totalpages": computedPages,
            "pageindexrange": `0-${(computedPages - 1)}`,
            "currentpageindex": pageIndex,
            "data": arrayData
        };
    };

    const getSavedsearchResults = (searchid, pageIndex, pagestoLoad) => {
        let arrayData = [];
        let columnConfigs = []; // To store both the clean key and the NetSuite column object

        // Load & extract search values
        const customSearch = search.load({ id: searchid });
        const pagedData = customSearch.runPaged({ pageSize: 1000 });
        const totalPages = pagedData.pageRanges.length;

        const additionalPage = totalPages % pagestoLoad > 0 ? 1 : 0;
        const computedPages = parseInt(parseInt(totalPages / pagestoLoad) + additionalPage);
        const totalrows = pagedData.count;
        log.debug({ title: 'pagestoLoad', details: pagestoLoad });
        log.debug({ title: 'totalPages', details: totalPages });
        log.debug({ title: 'computedPages', details: computedPages });
        log.debug({ title: 'totalrows', details: totalrows });


        const pagestoRun = pageIndex < (computedPages - 1) ? pagestoLoad : (totalPages % pagestoLoad === 0 ? pagestoLoad : totalPages % pagestoLoad);

        // 1. Pre-process columns to get sanitized keys
        columnConfigs = customSearch.columns.map((col) => {
            return {
                key: (col.label || col.name).toLowerCase().replace(/\s+/g, ''),
                columnObj: col
            };
        });

        // Loop to run through each computed pages
        for (let i = 0; i < pagestoRun; i++) {
            let currentPage = pagedData.fetch(i + (pageIndex * pagestoLoad));
            let results = currentPage.data;

            // 2. Process all data rows as objects
            const pageRows = results.map(result => {
                let rowObject = {};

                columnConfigs.forEach(config => {
                    // Attempt to get text (display value) first, fall back to raw value
                    let val = result.getText(config.columnObj) || result.getValue(config.columnObj) || "";
                    rowObject[config.key] = val;
                });

                return rowObject;
            });

            arrayData.push(...pageRows);
        }

        return {
            "analyticsname": customSearch.title,
            "analyticstype": customSearch.searchType,
            "totalrows": totalrows,
            "totalpages": computedPages,
            "pageindexrange": `0-${(computedPages - 1)}`,
            "currentpageindex": pageIndex,
            "data": arrayData
        };
    };

    return { get }
});