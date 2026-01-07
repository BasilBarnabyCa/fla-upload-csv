# CSV File Format Specification

This document defines the exact format required for CSV files uploaded to the FLA LMS system.

## File Requirements

### File Encoding
- **Encoding:** UTF-8 **without BOM** (Byte Order Mark)
- **Line Endings:** LF (`\n`) or CRLF (`\r\n`) - both acceptable
- **File Extension:** `.csv`

### File Naming
- **Pattern:** `YYYYMMDD.csv`
- **Example:** `20251229.csv` (for December 29, 2025)
- **Rules:**
  - 4-digit year (YYYY)
  - 2-digit month (MM) with leading zero if needed
  - 2-digit day (DD) with leading zero if needed
  - No spaces or special characters
  - Must end with `.csv`

## Column Structure

### Required Columns (13 columns total)

The CSV file **must** contain exactly 13 columns in this exact order:

| # | Column Name | Required | Data Type | Description |
|---|-------------|----------|-----------|-------------|
| 1 | `appli_no` | ✅ Yes | String | Application number (unique identifier) |
| 2 | `Licence_Type` | ⚠️ Optional | String | Licence type code (e.g., FULR, IB) |
| 3 | `trn` | ✅ Yes | String/Numeric | Tax Registration Number (9 digits) |
| 4 | `FName` | ⚠️ Optional | String | First name |
| 5 | `MName` | ⚠️ Optional | String | Middle name |
| 6 | `LName` | ⚠️ Optional | String | Last name |
| 7 | `file_status` | ⚠️ Optional | String | Status code (e.g., REC.CSO, INTCP) |
| 8 | `statusDate` | ⚠️ Optional | Date | Date when status change occurred |
| 9 | `comments` | ⚠️ Optional | String | Comments or notes |
| 10 | `entdte` | ⚠️ Optional | Date | Entry/submission date |
| 11 | `status_num` | ⚠️ Optional | Integer | Status sequence number (1, 2, 3...) |
| 12 | `app_file_locn` | ⚠️ Optional | String | File location code |
| 13 | `app_file_dept` | ✅ Yes | String | Department code (e.g., APC, FLA, REG1) |

### Column Header Format

**Exact header row (copy exactly):**
```csv
appli_no,Licence_Type,trn,FName,MName,LName,file_status,statusDate,comments,entdte,status_num,app_file_locn,app_file_dept
```

**Important:**
- ✅ Use **exact** column names (case-sensitive)
- ✅ Use **British spelling**: `Licence_Type` (not `License_Type`)
- ❌ **No BOM character** at start of file
- ❌ **No duplicate column names**
- ❌ **No extra columns**
- ❌ **No missing columns**

## Data Format Requirements

### 1. Application Number (`appli_no`)

**Format:** String (alphanumeric)
**Required:** Yes
**Examples:**
- `FULR2025REC_142713`
- `IB2024IB_7912`
- `FULR2008REC_2850`

**Rules:**
- Must be unique per application
- Can contain letters, numbers, underscores, hyphens
- No trailing spaces
- If missing, system will generate synthetic number (not recommended)

### 2. Licence Type (`Licence_Type`)

**Format:** String (code)
**Required:** Optional
**Examples:**
- `FULR`
- `IB`
- `FULR      ` (trailing spaces will be trimmed)

**Rules:**
- Use exact codes as provided
- Trailing spaces are acceptable (will be trimmed)
- Empty values allowed

### 3. TRN (`trn`)

**Format:** Numeric string (9 digits)
**Required:** Yes
**Examples:**
- `102452776`
- `104456191`
- `120948800`

**Rules:**
- Must be numeric (digits only)
- Typically 9 digits
- Used for matching applicants
- **Security Note:** Only last 4 digits stored by default (configurable)

### 4. First Name (`FName`)

**Format:** String
**Required:** Optional
**Examples:**
- `Paul`
- `Onandi`
- `Dan- Niel` (hyphens allowed)

**Rules:**
- Can contain letters, hyphens, apostrophes, spaces
- Trailing/leading spaces will be trimmed
- Empty values allowed

### 5. Middle Name (`MName`)

**Format:** String
**Required:** Optional
**Examples:**
- `Anthony`
- `Anthony Ricardo`
- Empty (if no middle name)

**Rules:**
- Can contain letters, hyphens, apostrophes, spaces
- Trailing/leading spaces will be trimmed
- Empty values allowed

### 6. Last Name (`LName`)

**Format:** String
**Required:** Optional
**Examples:**
- `Lyn`
- `Anderson`
- `Smith`

**Rules:**
- Can contain letters, hyphens, apostrophes, spaces
- Trailing/leading spaces will be trimmed
- Empty values allowed

### 7. File Status (`file_status`)

**Format:** String (status code)
**Required:** Optional
**Examples:**
- `REC.CSO`
- `INTCP`
- `SUBREGY`
- `PRCSNG`
- `PO`

**Rules:**
- Use exact status codes as provided
- Trailing spaces acceptable (will be trimmed)
- Empty values allowed
- Status codes are mapped to public-friendly labels internally

### 8. Status Date (`statusDate`)

**Format:** Date (ISO 8601 Standard)
**Required:** Optional
**Required Format:** `YYYY-MM-DD` (ISO 8601)
**Optional:** `YYYY-MM-DD HH:mm:ss.SSS` (with timestamp)

**Examples:**
- `2025-12-29` ✅ **Required format**
- `2025-12-29 00:00:00.000` ✅ **Accepted (with timestamp)**
- `12/29/2025` ⚠️ **Deprecated (legacy format, still accepted for backward compatibility)**
- `6/25/2008` ⚠️ **Deprecated (legacy format, still accepted for backward compatibility)**

**Rules:**
- **MUST use ISO 8601 format:** `YYYY-MM-DD` (industry standard)
- Timestamps optional: `YYYY-MM-DD HH:mm:ss.SSS` format accepted
- Legacy format (`M/D/YYYY`) deprecated but still accepted for backward compatibility
- Empty values allowed (will use entry date as fallback)
- **4-digit year required**
- **2-digit month and day with leading zeros** (01, 02, etc.)

### 9. Comments (`comments`)

**Format:** String
**Required:** Optional
**Examples:**
- `Application received for: 9MM Pistol.`
- `Purchase order no: 2025/046140A`
- `Completed`
- Empty

**Rules:**
- Can contain any text
- Internal notes (not exposed to public)
- Empty values allowed
- Special characters allowed

### 10. Entry Date (`entdte`)

**Format:** Date (ISO 8601 Standard)
**Required:** Optional
**Required Format:** `YYYY-MM-DD` (ISO 8601)
**Optional:** `YYYY-MM-DD HH:mm:ss.SSS` (with timestamp)

**Examples:**
- `2025-12-30` ✅ **Required format**
- `2025-12-30 16:34:04.000` ✅ **Accepted (with timestamp)**
- `12/30/2025` ⚠️ **Deprecated (legacy format, still accepted for backward compatibility)**
- `6/25/2008` ⚠️ **Deprecated (legacy format, still accepted for backward compatibility)**

**Rules:**
- **MUST use ISO 8601 format:** `YYYY-MM-DD` (industry standard)
- Date when application was submitted/entered
- Timestamps optional: `YYYY-MM-DD HH:mm:ss.SSS` format accepted
- Legacy format (`M/D/YYYY`) deprecated but still accepted for backward compatibility
- Empty values allowed
- **4-digit year required**
- **2-digit month and day with leading zeros** (01, 02, etc.)

### 11. Status Number (`status_num`)

**Format:** Integer
**Required:** Optional
**Examples:**
- `1`
- `3`
- `11`
- `16`

**Rules:**
- Sequential number indicating order of status changes
- Higher number = more recent status
- Must be numeric (no decimals)
- Empty values allowed
- Used to determine latest status for each application

### 12. File Location (`app_file_locn`)

**Format:** String (code)
**Required:** Optional
**Examples:**
- `REG1`
- `REG2`
- `REG3`
- `FLA`

**Rules:**
- Location/registry code
- Trailing spaces acceptable (will be trimmed)
- Empty values allowed

### 13. Department (`app_file_dept`)

**Format:** String (code)
**Required:** **YES** ⚠️
**Examples:**
- `APC`
- `FLA`
- `REG1`
- `REG2`
- `REG3`

**Rules:**
- **This column is REQUIRED**
- Department code at time of status change
- Trailing spaces acceptable (will be trimmed)
- Empty values will result in `null` department (not recommended)

## CSV File Structure

### Header Row

**Must be first row:**
```csv
appli_no,Licence_Type,trn,FName,MName,LName,file_status,statusDate,comments,entdte,status_num,app_file_locn,app_file_dept
```

### Data Rows

**Example valid rows:**
```csv
FULR2025REC_142713,FULR,102452776,Paul,Anthony,Lyn,INTCP,2025-12-24,Completed,2025-12-24,3,REG2,APC
FULR2025REC_142802,FULR,120948800,Onandi,Anthony,Morrison,REC.CSO,2025-12-29,Application received for: 9MM Pistol.,2025-12-30,1,REG1,FLA
IB2024IB_7912,IB,102114986,David,,Benain,PRCSNG,2025-12-24,,2025-12-24,7,FLA,APC
```

### Multiple Status Entries

**Same application can have multiple rows** (audit log format):
```csv
FULR2025REC_142713,FULR,102452776,Paul,Anthony,Lyn,REC.CSO,2025-12-24,Application received,2025-12-24,1,REG2,APC
FULR2025REC_142713,FULR,102452776,Paul,Anthony,Lyn,INTCP,2025-12-24,Completed,2025-12-24,3,REG2,APC
FULR2025REC_142713,FULR,102452776,Paul,Anthony,Lyn,SUBREGY,2025-12-24,Completed,2025-12-24,11,REG2,APC
```

**Note:** Each row represents a status change event. The system uses `status_num` to determine the latest status.

## Formatting Rules

### Quoting

**Optional but consistent:**
- You can quote values: `"FULR2025REC_142713"`
- Or leave unquoted: `FULR2025REC_142713`
- **Be consistent** - don't mix quoted and unquoted in same file
- If quoting, escape internal quotes with `""`

### Whitespace

**Rules:**
- ✅ Trailing spaces are acceptable (will be trimmed automatically)
- ✅ Leading spaces are acceptable (will be trimmed automatically)
- ❌ Avoid unnecessary spaces in values
- ❌ No tabs or newlines within field values

### Empty Values

**Format:**
- Use empty string between commas: `,value,` or `value,,value`
- **Do not use:**
  - `null`
  - `NULL`
  - `N/A`
  - `-`
  - Spaces: ` value `

### Special Characters

**Allowed:**
- Letters (A-Z, a-z)
- Numbers (0-9)
- Hyphens (`-`)
- Underscores (`_`)
- Apostrophes (`'`)
- Periods (`.`)
- Spaces (within values)

**Avoid:**
- Control characters (tabs, newlines within fields)
- Unicode characters that may cause encoding issues

## Common Mistakes to Avoid

### ❌ Incorrect Column Headers

**Wrong:**
```csv
﻿appli_no,Licence_Type,trn,...  (BOM character - remove this)
appli_no,Licence_Type,trn,...,entdte,entdte,...  (duplicate column)
appli_no,Licence_Type,trn,...  (missing app_file_dept)
```

**Correct:**
```csv
appli_no,Licence_Type,trn,FName,MName,LName,file_status,statusDate,comments,entdte,status_num,app_file_locn,app_file_dept
```

### ❌ Incorrect Date Formats

**Wrong:**
```csv
29-12-2025  (DD-MM-YYYY - not supported)
Dec 29, 2025  (text format - not supported)
2025/12/29  (slashes in ISO format - not supported)
12/29/2025  (M/D/YYYY - deprecated, use ISO format instead)
```

**Correct (Required):**
```csv
2025-12-29  (YYYY-MM-DD - ISO 8601 standard, REQUIRED)
2025-12-29 00:00:00.000  (with timestamp - optional)
```

**Deprecated (Still Accepted):**
```csv
12/29/2025  (M/D/YYYY - legacy format, deprecated but still accepted)
```

### ❌ Missing Required Columns

**Wrong:**
- Missing `app_file_dept` column
- Missing `appli_no` column
- Wrong column order

**Correct:**
- All 13 columns present
- Exact column order
- Exact column names

### ❌ File Encoding Issues

**Wrong:**
- UTF-8 with BOM
- Windows-1252 encoding
- Other character encodings

**Correct:**
- UTF-8 without BOM

## Validation Checklist

Before uploading, verify:

- [ ] File is UTF-8 encoded without BOM
- [ ] File name follows `YYYYMMDD.csv` pattern
- [ ] Header row has exactly 13 columns
- [ ] Column names match exactly (case-sensitive)
- [ ] Column order is correct
- [ ] `app_file_dept` column is present
- [ ] No duplicate column names
- [ ] Dates use `YYYY-MM-DD` format (ISO 8601 standard - REQUIRED)
- [ ] TRN values are numeric
- [ ] `status_num` values are integers
- [ ] No control characters in data
- [ ] File opens correctly in a text editor

## Example Complete CSV File

```csv
appli_no,Licence_Type,trn,FName,MName,LName,file_status,statusDate,comments,entdte,status_num,app_file_locn,app_file_dept
FULR2025REC_142713,FULR,102452776,Paul,Anthony,Lyn,REC.CSO,2025-12-24,Application received for: 9MM Pistol.,2025-12-24,1,REG2,APC
FULR2025REC_142713,FULR,102452776,Paul,Anthony,Lyn,INTCP,2025-12-24,Completed,2025-12-24,3,REG2,APC
FULR2025REC_142713,FULR,102452776,Paul,Anthony,Lyn,SUBREGY,2025-12-24,Completed,2025-12-24,11,REG2,APC
FULR2025REC_142802,FULR,120948800,Onandi,Anthony,Morrison,REC.CSO,2025-12-29,Application received for: 9MM Pistol.,2025-12-30,1,REG1,FLA
IB2024IB_7912,IB,102114986,David,,Benain,PRCSNG,2025-12-24,,2025-12-24,7,FLA,APC
```

## Technical Details

### How the Import Works

1. **File Parsing:**
   - CSV parser reads file row by row
   - Trims all string values automatically
   - Removes BOM characters from column names
   - Handles both quoted and unquoted values

2. **Data Processing:**
   - Each row represents a status change event
   - Multiple rows per application are allowed (audit log)
   - Latest status determined by `status_num` (highest number)

3. **User Matching:**
   - Users matched by TRN (`trn` column)
   - If TRN not found, user created automatically
   - User identifier: `csv-import-{TRN}`

4. **Application Matching:**
   - Applications matched by `appli_no`
   - If application exists, status updated if `status_num` is higher
   - If new application, created with current status

5. **Status Timeline:**
   - All status changes stored in `application_log` table
   - Timeline sorted by `status_num` descending (newest first)
   - Each status change includes: code, date, department, comments

### Data Storage

- **TRN Storage:** Only last 4 digits stored by default (configurable)
- **Full TRN:** Available during import for matching, then truncated
- **Status Codes:** Internal codes mapped to public-friendly labels
- **Department:** Stored per status change (can change over time)

## Support

**Questions or Issues?**
- Contact: [Your support email]
- Phone: [Your support phone]

**Common Issues:**
- **Import fails:** Check column structure matches specification
- **Missing data:** Verify all required columns present
- **Date errors:** Use ISO 8601 format `YYYY-MM-DD` (required standard)
- **Encoding issues:** Save file as UTF-8 without BOM

---

**Document Version:** 1.0  
**Last Updated:** [Date]  
**Applies to:** FLA LMS CSV Import System

