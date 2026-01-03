# NetSuite Analytics Restlet API Integration

**Version:** 1.1.0  
**License:** MIT (Copyright © 2026 Solenex Technology Pvt Ltd.)  
**Last Updated:** January 2026

---

## Overview

This repository contains two production-ready NetSuite Restlet scripts for retrieving metadata and analytical data from NetSuite Saved Searches and SuiteAnalytics Datasets. These scripts enable seamless integration with external systems—such as Google Sheets, Tableau, Power BI, or custom applications—providing dynamic, paginated access to NetSuite analytics without manual export/import workflows.

**Key Features:**
- Support for both **Saved Searches** and **SuiteAnalytics Datasets**
- Efficient **paginated data retrieval** (1,000 records per native page)
- **Custom pagination** to combine multiple internal pages into single API responses
- **JSON object responses** with sanitized column keys (lowercase, spaces removed)
- **Smart value extraction** using `getText()` for display values and `getValue()` for raw values
- JSON API responses compatible with Google Sheets, Zapier, Power Automate
- Comprehensive error handling and logging
- Production-grade code with MIT license

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Script 1: Metadata Retrieval](#script-1-metadata-retrieval)
3. [Script 2: Data Retrieval](#script-2-data-retrieval)
4. [Pagination & Custom Page Sizing](#pagination--custom-page-sizing)
5. [API Integration Examples](#api-integration-examples)
6. [Error Handling](#error-handling)
7. [Deployment Guide](#deployment-guide)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- NetSuite account with SuiteScript 2.1 support
- Admin access to create Restlet scripts
- Knowledge of your Saved Search or Dataset IDs (format: `customsearch_XXXXX` or `custdataset_XXXXX`)

### Basic Flow
1. **Get metadata** → Call `getAnalyticsMetadata_RS.js` to learn total rows & pages
2. **Fetch data** → Call `getAnalyticsData_RS.js` for paginated results
3. **Integrate** → Parse JSON response and process records by object key

---

## Script 1: Metadata Retrieval

**File:** [getAnalyticsMetadata_RS.js](https://github.com/chandana-solenex/ns-analytics-datapull/blob/main/getAnalyticsMetadata_RS.js)

### Purpose
Retrieves summary metadata about a Saved Search or Dataset without pulling actual data. Use this to:
- Determine total row count
- Calculate pagination pages
- Validate report ID before bulk data fetches
- Display data availability status to end users

### Deployment
1. In NetSuite, go to **Customization > Scripts > New**
2. Select **Restlet** as script type
3. Paste the content of `getAnalyticsMetadata_RS.js`
4. Set script name: `Analytics Metadata Retriever`
5. Deploy and note the **Script ID** and **Deployment ID**

### HTTP Endpoint
GET https://[account-id].suiteapis.com/rest/script/[script-id]/deploy/[deploy-id]

### Request Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `analyticsreportid` | String | ✓ | Saved Search or Dataset ID | `customsearch_ar_aging` or `custdataset_123456` |
| `pagestoload` | Integer | ✓ | Number of 1,000-record pages to group into one output page | `5` (groups 5×1000 = 5,000 records/response) |


### Response Format

**For Saved Search:**
```json
{
  "analyticsname": "AR Aging Report",
  "analyticstype": "SALES_ORDER_TYPE",
  "totalrows": 3250,
  "totalpages": 4,
  "pageindexrange": "0-3"
}
```


**For Dataset:**
```json
{
  "analyticsname": "Inventory Summary",
  "analyticstype": "WORKBOOK",
  "totalrows": 15000,
  "totalpages": 15,
  "pageindexrange": "0-14"
}
```

### Response Fields

| Field | Description |
|-------|-------------|
| `analyticsname` | Name of the Saved Search or Dataset |
| `analyticstype` | Search type or Dataset type |
| `totalrows` | Total number of data rows |
| `totalpages` | Number of custom-paginated pages (based on `pagestoload`) |
| `pageindexrange` | Valid page indices to request (e.g., `0-2` means pages 0, 1, 2) |

### Error Responses

**Missing Parameter:**
```json
{
  "error": "MISSING_PAGESTOLOAD",
  "message": "The pagestoload parameter is required"
}
```

**Invalid Report ID:**
```json
{
  "error": "INVALID_REPORTID",
  "message": "The dataset/saved search id is invalid"
}
```

---

## Script 2: Data Retrieval

**File:** [getAnalyticsData_RS.js](https://github.com/chandana-solenex/ns-analytics-datapull/blob/main/getAnalyticsData_RS.js)

### Purpose
Fetches actual data rows from a Saved Search or Dataset as JSON objects with sanitized column keys. Designed for direct integration with:
- Power Automate / Zapier
- Custom web applications
- BI tools (Tableau, Power BI via custom API connectors)

### Key Features
- **Column key sanitization**: All column names are lowercase with spaces removed (e.g., `"Order ID"` → `orderid`)
- **Smart value extraction**: Uses `getText()` for display values on Saved Searches, `getValue()` for raw values
- **Null handling**: Null/undefined values converted to empty strings
- **Object format**: Data returned as array of objects (easy to process and iterate)

### Deployment
1. In NetSuite, go to **Customization > Scripts > New**
2. Select **Restlet** as script type
3. Paste the content of `getAnalyticsData_RS.js`
4. Set script name: `Analytics Data Retriever`
5. Deploy and note the **Script ID** and **Deployment ID**

### HTTP Endpoint
GET https://[account-id].suiteapis.com/rest/script/[script-id]/deploy/[deploy-id]

### Request Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `analyticsreportid` | String | ✓ | Saved Search or Dataset ID | `customsearch_ar_aging` or `custdataset_123456` |
| `pageindex` | Integer | ✓ | Page number to retrieve (0-indexed, based on `pagestoload` grouping) | `0` (first page) |
| `pagestoload` | Integer | ✓ | Number of 1,000-record pages to combine into one output page | `5` |


### Response Format

**For Saved Search:**

```json
{
    "analyticsname": "AR Aging Report",
    "analyticstype": "SALES_ORDER_TYPE",
    "totalrows": 3250,
    "totalpages": 1,
    "pageindexrange": "0-0",
    "currentpageindex": 0,
    "data": [
        {
        "orderid": "12345",
        "customer": "ACME Corp",
        "amount": "5000.00",
        "daysoverdue": "45"
        },
        {
        "orderid": "12346",
        "customer": "Tech Solutions",
        "amount": "3200.50",
        "daysoverdue": "30"
        }
    ]
}
```

**For Dataset:**
```json
{
    "analyticsname": "Inventory Summary",
    "analyticstype": "WORKBOOK",
    "totalrows": 15000,
    "totalpages": 3,
    "pageindexrange": "0-2",
    "currentpageindex": 0,
    "data": [
    {
        "item": "SKU-001",
        "location": "Warehouse A",
        "quantity": "450",
        "reorderlevel": "100"
    },
    {
        "item": "SKU-002",
        "location": "Warehouse B",
        "quantity": "230",
        "reorderlevel": "50"
    }
    ]
}
```

### Response Fields

| Field | Description |
|-------|-------------|
| `analyticsname` | Name of the report |
| `analyticstype` | Search/Dataset type |
| `totalrows` | Total data rows in report |
| `totalpages` | Total custom-paginated pages available |
| `pageindexrange` | Valid page indices (e.g., `0-2` means pages 0, 1, 2 exist) |
| `currentpageindex` | Page number of this response |
| `data` | Array of objects; keys are sanitized column names |

### Data Object Structure

**Column Key Sanitization Rules:**
- Convert to lowercase: `"Order ID"` → `"order id"`
- Remove spaces: `"order id"` → `"orderid"`
- Resulting key is alphanumeric and safe for property access

**Example object from response:**
```json
{
  orderid: "12345",           // Original: "Order ID"
  customer: "acmecorp",       // Original: "Customer"
  amount: "5000.00",          // Original: "Amount"
  daysoverdue: "45"           // Original: "Days Overdue"
}
```

### Error Responses

**Missing Parameter:**
```json
{
  "error": "MISSING_PAGEINDEX",
  "message": "The pageindex parameter is required"
}
```

```json
{
  "error": "MISSING_PAGESTOLOAD",
  "message": "The pagestoload parameter is required"
}
```

**Invalid Report ID:**
```json
{
  "error": "INVALID_REPORTID",
  "message": "The dataset/saved search id is invalid"
}
```

---

## Pagination & Custom Page Sizing

### Understanding NetSuite's Native Pagination

NetSuite's `runPaged()` API returns **1,000 records per page** (hard limit). For a Saved Search with 5,000 rows:

Native Pages: 5 pages (pages 0–4, each with ≤1,000 records)

### Custom Page Grouping

The `pagestoload` parameter lets you **combine multiple native pages** into a single API response. This reduces external API calls and network round-trips.

**Example:**
Saved Search: 5,000 rows
pagestoload: 5 (group 5 native pages = 5,000 rows into 1 API response)

Result:
Custom Pages: 1 page (page 0, containing 5,000 rows)
pageindexrange: "0-0"

**Example 2:**
Dataset: 18,500 rows
Native pages: 19 (pages 0–18)
pagestoload: 5

Calculation:
computedPages = ceil(19 / 5) = 4
Result:
Custom Pages: 4 pages
  Page 0: native pages 0–4 (5,000 rows)
  Page 1: native pages 5–9 (5,000 rows)
  Page 2: native pages 10–14 (5,000 rows)
  Page 3: native pages 15–18 (3,500 rows)

pageindexrange: "0-3"

### Choosing `pagestoload` Value

| Use Case | Recommended Value | Rationale |
|----------|-------------------|-----------|
| Small reports (<5K rows) | `1` or `2` | Minimal latency, simple handling |
| Medium reports (5K–50K) | `5–10` | Balance between payload size and API calls |
| Large reports (>50K) | `10–20` | Minimize network overhead, reduce API calls |
| Google Sheets real-time sync | `1–3` | Avoid timeout (Sheets timeout = ~30 sec) |
| Batch/overnight jobs | `20+` | Maximize throughput, ignore latency |

---

## API Integration Examples


### Example 1: Power Automate – Process Records

```json
{
  "type": "object",
  "properties": {
    "analyticsreportid": {
      "type": "string",
      "description": "NetSuite Dataset ID (e.g., custdataset_123456)"
    },
    "pageindex": {
      "type": "integer",
      "description": "Page to fetch (0-indexed)"
    },
    "pagestoload": {
      "type": "integer",
      "description": "Pages per request"
    }
  }
}
```

**Flow:**
1. **HTTP Request** → GET to Restlet with params
2. **Parse JSON** → Extract `data` array (objects)
3. **Apply to each** → Loop through records
4. **Create Row** → Insert into SharePoint/SQL using object properties

---

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `INVALID_REPORTID` | Wrong dataset/search ID | Verify ID in NetSuite (format: `customsearch_*` or `custdataset_*`) |
| `MISSING_PAGESTOLOAD` | Parameter not provided | Add `pagestoload` parameter (e.g., `&pagestoload=5`) |
| `MISSING_PAGEINDEX` | Parameter not provided (data script only) | Add `pageindex` parameter (e.g., `&pageindex=0`) |
| 401 Unauthorized | Bad authentication | Check OAuth token expiry or auth header format |
| 403 Forbidden | User lacks permissions | Ensure user has permissions to view the Saved Search/Dataset |
| 500 Internal Error | Script runtime error | Check NetSuite script logs for detailed error |

### Logging & Debugging

Both scripts use **`log.debug()`** and **`log.error()`** for logging. View logs in:
- **NetSuite UI:** Customization > Scripts > [Script Name] > Execution Log
- **SuiteScript Debugger:** Customization > Scripts > [Script Name] > Debug

---

## Deployment Guide

### Step 1: Create Script in NetSuite

1. Navigate to **Customization > Scripts > New**
2. Select **Restlet** as script type
3. Copy content of `getAnalyticsMetadata_RS.js` or `getAnalyticsData_RS.js`
4. Click **Save**

### Step 2: Create Deployment

1. Click **Deployments** tab
2. Click **New**
3. Set Status to **Testing** (or **Released** for production)
4. Click **Save**
5. Note the **Script ID** and **Deployment ID** from the deployment record

### Step 3: Configure Permissions

1. Ensure user/role running the script has:
   - **Saved Searches:** Read access to the specific searches
   - **Datasets:** Read access to the specific datasets
   - **SuiteScript:** Permission to execute Restlets

2. Grant via **Setup > Users/Roles > [Role] > Permissions**

### Step 4: Obtain API Credentials

For OAuth 2.0 (recommended):
1. Create **Integration Record** (Setup > Integration Management > New)
2. Generate OAuth tokens
3. Use tokens in `Authorization: Bearer [access_token]` header

For NLAuth (legacy):
1. Enable **Token-based Authentication** on user record
2. Create **Access Token** (Setup > Users > [User] > Access Tokens)
3. Use in header: `Authorization: NLAuth nlauth_account=..., nlauth_email=..., nlauth_signature=..., nlauth_timestamp=...`

---

## Performance Considerations

### API Rate Limits
- NetSuite enforces **10 requests per second** (REST API limit)
- Space out requests if fetching many pages
- Consider batch windows (daily overnight jobs)

### Optimization Tips

1. **Reduce `pagestoload` for real-time requests**
   pagestoload: 1–2 (faster response, smaller payload)

2. **Increase `pagestoload` for batch jobs**
   pagestoload: 20+ (fewer API calls, larger payload)

3. **Cache metadata responses**
   - Call metadata endpoint once, reuse page count
   - Avoid recalculating total pages

4. **Use parallel requests** (if integrating with external services)
   - Fetch pages 0, 1, 2 simultaneously
   - Combine results after all succeed

5. **Filter in NetSuite, not externally**
   - If you only need recent records, add date filters to Saved Search
   - Reduces payload size before API transfer

### Payload Size Estimates

| Scenario | Rows | Columns | Approx JSON Size | Estimate |
|----------|------|---------|------------------|----------|
| AR Aging (typical) | 3,000 | 8 | ~600 KB | 0.8 sec |
| Inventory (large) | 15,000 | 12 | ~3.5 MB | 2.5 sec |
| Sales Orders (huge) | 50,000 | 20 | ~14 MB | 10 sec |

---

## Troubleshooting

### Issue: "No data returned"

**Check:**
1. Verify Saved Search/Dataset contains records
2. Confirm filters are not too restrictive
3. Check user permissions on the report
4. Review script execution logs

### Issue: "Timeout on page fetch"

**Solutions:**
1. Reduce `pagestoload` (e.g., from 10 to 5)
2. Reduce column count in Saved Search (remove unnecessary columns)
3. Request during off-peak hours
4. Check NetSuite system performance

### Issue: "Memory exceeded"

**Causes:**
- `pagestoload` too high for large datasets
- Complex Saved Search with many joined records

**Solutions:**
1. Lower `pagestoload` to 5–10
2. Optimize Saved Search (remove joins, simplify filters)
3. Request during maintenance window

### Issue: "Column key mismatch in parsing"

**Note:** Column keys are sanitized to lowercase with spaces removed. If mapping data:

// Column "Order ID" becomes "orderid"
record.orderid  // Not record['Order ID']

Verify your consuming application matches sanitized keys.

---

## Support & Contribution

**Issues or questions?** Contact [**Solenex Technology**](mailto:support@solenex.com) or open an issue in the repository.

**Contributing:** Pull requests welcome. Please follow:
- SuiteScript 2.1 conventions
- Consistent error response format
- Add test cases for new features

---

## License

MIT License – See LICENSE file for details.

**© 2026 Solenex Technology Pvt Ltd. All Rights Reserved.**

---

## Quick Reference

### Metadata Endpoint
GET /rest/script/[ID]/deploy/[ID]?analyticsreportid=XXX&pagestoload=N

### Data Endpoint
GET /rest/script/[ID]/deploy/[ID]?analyticsreportid=XXX&pageindex=N&pagestoload=M

### Response Format
```json
{
  "analyticsname": "Report Name",
  "analyticstype": "Type",
  "totalrows": 1000,
  "totalpages": 1,
  "pageindexrange": "0-1",
  "currentpageindex": 0,
  "data": [
    { "columnkey1": "value1", "columnkey2": "value2" },
    { "columnkey1": "value3", "columnkey2": "value4" }
  ]
}
```

### Parameter Quick Reference
- `analyticsreportid` (required): Saved Search or Dataset ID
- `pageindex` (required for data): Page number (0-indexed)
- `pagestoload` (required): Pages per response (1–20 recommended)
