/**
 * CSV Validation for FLA LMS CSV Import Specification
 * Validates CSV files against the specification in docs/csv-specification.md
 */

import { getBusinessDate } from './timezone.js';

const REQUIRED_COLUMNS = [
  'appli_no',
  'Licence_Type',
  'trn',
  'FName',
  'MName',
  'LName',
  'file_status',
  'statusDate',
  'comments',
  'entdte',
  'status_num',
  'app_file_locn',
  'app_file_dept'
];

const REQUIRED_COLUMN_INDICES = {
  appli_no: 0,
  trn: 2,
  app_file_dept: 12
};

/**
 * Check if file has BOM (Byte Order Mark)
 */
function hasBOM(content) {
  // UTF-8 BOM: EF BB BF
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const firstBytes = new Uint8Array(content.slice(0, 3));
  return firstBytes.length === 3 && 
         firstBytes[0] === bom[0] && 
         firstBytes[1] === bom[1] && 
         firstBytes[2] === bom[2];
}

/**
 * Remove BOM from content
 */
function removeBOM(content) {
  if (hasBOM(content)) {
    return content.slice(3);
  }
  return content;
}

/**
 * Parse CSV content into rows
 */
function parseCSV(content) {
  const text = new TextDecoder('utf-8').decode(removeBOM(content));
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { rows: [], errors: ['File is empty'] };
  }

  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const row = parseCSVRow(lines[i], i + 1);
    if (row.error) {
      return { rows: [], errors: [row.error] };
    }
    rows.push(row.values);
  }

  return { rows, errors: [] };
}

/**
 * Parse a single CSV row (handles quoted values)
 */
function parseCSVRow(line, lineNumber) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current.trim());
  
  return { values, error: null };
}

/**
 * Validate date format (ISO 8601 YYYY-MM-DD or legacy M/D/YYYY)
 */
function validateDate(dateStr, fieldName, rowNumber) {
  if (!dateStr || dateStr.trim() === '' || dateStr.trim().toUpperCase() === 'NULL') {
    return null; // Empty dates and NULL strings are allowed (optional fields)
  }

  const trimmed = dateStr.trim();
  
  // ISO 8601 format: YYYY-MM-DD (required)
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})(\s+\d{2}:\d{2}:\d{2}(\.\d{3})?)?$/;
  if (isoPattern.test(trimmed)) {
    const [, year, month, day] = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    
    if (monthNum < 1 || monthNum > 12) {
      return `Row ${rowNumber}: ${fieldName} has invalid month: ${month}`;
    }
    if (dayNum < 1 || dayNum > 31) {
      return `Row ${rowNumber}: ${fieldName} has invalid day: ${day}`;
    }
    return null; // Valid ISO format
  }

  // Legacy format: M/D/YYYY (deprecated but accepted)
  const legacyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  if (legacyPattern.test(trimmed)) {
    const [, month, day, year] = trimmed.match(legacyPattern);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);
    
    if (monthNum < 1 || monthNum > 12) {
      return `Row ${rowNumber}: ${fieldName} has invalid month: ${month}`;
    }
    if (dayNum < 1 || dayNum > 31) {
      return `Row ${rowNumber}: ${fieldName} has invalid day: ${day}`;
    }
    // Return warning (not error) for legacy format
    return `Row ${rowNumber}: ${fieldName} uses deprecated date format (M/D/YYYY). Please use ISO 8601 format (YYYY-MM-DD)`;
  }

  return `Row ${rowNumber}: ${fieldName} has invalid date format: "${trimmed}". Use YYYY-MM-DD format`;
}

/**
 * Validate TRN (9 digits, numeric)
 */
function validateTRN(trn, rowNumber) {
  if (!trn || trn.trim() === '') {
    return `Row ${rowNumber}: trn is required`;
  }

  const trimmed = trn.trim();
  if (!/^\d+$/.test(trimmed)) {
    return `Row ${rowNumber}: trn must be numeric, got: "${trimmed}"`;
  }

  if (trimmed.length !== 9) {
    return `Row ${rowNumber}: trn must be 9 digits, got ${trimmed.length} digits`;
  }

  return null;
}

/**
 * Validate status_num (integer)
 */
function validateStatusNum(statusNum, rowNumber) {
  if (!statusNum || statusNum.trim() === '') {
    return null; // Optional field
  }

  const trimmed = statusNum.trim();
  if (!/^\d+$/.test(trimmed)) {
    return `Row ${rowNumber}: status_num must be an integer, got: "${trimmed}"`;
  }

  return null;
}

/**
 * Validate CSV file against FLA LMS specification
 * @param {ArrayBuffer|Buffer} fileContent - File content as buffer
 * @param {string} originalFilename - Original filename
 * @returns {Object} Validation result with errors, warnings, and suggested filename
 */
export function validateCSV(fileContent, originalFilename) {
  const errors = [];
  const warnings = [];
  
  // Check for BOM
  if (hasBOM(fileContent)) {
    warnings.push('File contains BOM (Byte Order Mark). BOM will be removed during processing.');
  }

  // Parse CSV
  const { rows, errors: parseErrors } = parseCSV(fileContent);
  if (parseErrors.length > 0) {
    return {
      valid: false,
      errors: parseErrors,
      warnings: [],
      suggestedFilename: null
    };
  }

  if (rows.length === 0) {
    return {
      valid: false,
      errors: ['File contains no data rows'],
      warnings: [],
      suggestedFilename: null
    };
  }

  // Validate header row
  const headerRow = rows[0];
  
  // Check column count
  if (headerRow.length !== REQUIRED_COLUMNS.length) {
    return {
      valid: false,
      errors: [`Header row has ${headerRow.length} columns, expected ${REQUIRED_COLUMNS.length} columns`],
      warnings: [],
      suggestedFilename: null
    };
  }

  // Check column names (case-sensitive)
  const columnMismatches = [];
  for (let i = 0; i < REQUIRED_COLUMNS.length; i++) {
    if (headerRow[i] !== REQUIRED_COLUMNS[i]) {
      columnMismatches.push(`Column ${i + 1}: expected "${REQUIRED_COLUMNS[i]}", got "${headerRow[i]}"`);
    }
  }

  if (columnMismatches.length > 0) {
    return {
      valid: false,
      errors: ['Column header mismatch:', ...columnMismatches],
      warnings: [],
      suggestedFilename: null
    };
  }

  // Check for duplicate columns
  const seenColumns = new Set();
  for (let i = 0; i < headerRow.length; i++) {
    if (seenColumns.has(headerRow[i])) {
      return {
        valid: false,
        errors: [`Duplicate column name: "${headerRow[i]}"`],
        warnings: [],
        suggestedFilename: null
      };
    }
    seenColumns.add(headerRow[i]);
  }

  // Validate data rows
  const dataRows = rows.slice(1);
  
  if (dataRows.length === 0) {
    return {
      valid: false,
      errors: ['File contains header but no data rows'],
      warnings: [],
      suggestedFilename: null
    };
  }

  // Validate each data row
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // +2 because header is row 1, and arrays are 0-indexed

    // Check column count matches header
    if (row.length !== REQUIRED_COLUMNS.length) {
      errors.push(`Row ${rowNumber}: has ${row.length} columns, expected ${REQUIRED_COLUMNS.length}`);
      continue; // Skip further validation for this row
    }

    // Validate required fields
    const appliNo = row[REQUIRED_COLUMN_INDICES.appli_no];
    if (!appliNo || appliNo.trim() === '') {
      errors.push(`Row ${rowNumber}: appli_no is required`);
    }

    const trnError = validateTRN(row[REQUIRED_COLUMN_INDICES.trn], rowNumber);
    if (trnError) {
      errors.push(trnError);
    }

    const appFileDept = row[REQUIRED_COLUMN_INDICES.app_file_dept];
    if (!appFileDept || appFileDept.trim() === '') {
      errors.push(`Row ${rowNumber}: app_file_dept is required`);
    }

    // Validate dates
    const statusDateError = validateDate(row[7], 'statusDate', rowNumber);
    if (statusDateError) {
      if (statusDateError.includes('deprecated')) {
        warnings.push(statusDateError);
      } else {
        errors.push(statusDateError);
      }
    }

    const entdteError = validateDate(row[9], 'entdte', rowNumber);
    if (entdteError) {
      if (entdteError.includes('deprecated')) {
        warnings.push(entdteError);
      } else {
        errors.push(entdteError);
      }
    }

    // Validate status_num
    const statusNumError = validateStatusNum(row[10], rowNumber);
    if (statusNumError) {
      errors.push(statusNumError);
    }
  }

  // Generate suggested filename (YYYYMMDD.csv) using business timezone
  const businessDate = getBusinessDate();
  const [year, month, day] = businessDate.split('-');
  const suggestedFilename = `${year}${month}${day}.csv`;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestedFilename,
    rowCount: dataRows.length
  };
}

