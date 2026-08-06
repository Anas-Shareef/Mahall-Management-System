import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertCircle, X, Check } from 'lucide-react';

export interface ColumnGuide {
  key: string;
  label: string;
  description: string;
  example: string;
}

export interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  moduleName: string;
  columns: ColumnGuide[];
  sampleRow: Record<string, string>;
  sampleCsvFilename: string;
  onImport: (parsedData: Record<string, any>[]) => Promise<void>;
  isLoading?: boolean;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = 'Import multiple records at once using an Excel or CSV file',
  moduleName,
  columns,
  sampleRow,
  sampleCsvFilename,
  onImport,
  isLoading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setParsedRows([]);
      setParseError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate and download sample CSV file
  const handleDownloadSample = () => {
    const headers = columns.map((c) => c.key).join(',');
    const sampleValues = columns.map((c) => `"${(sampleRow[c.key] || c.example).replace(/"/g, '""')}"`).join(',');
    const csvContent = `${headers}\n${sampleValues}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sampleCsvFilename.endsWith('.csv') ? sampleCsvFilename : `${sampleCsvFilename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV file selection and parsing
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('File content is empty');

        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error('CSV file must contain a header row and at least 1 data row.');
        }

        const parseCsvLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const fileHeaders = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
        const rows: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCsvLine(lines[i]);
          if (values.length === 0 || (values.length === 1 && !values[0])) continue;

          const rowObj: Record<string, string> = {};
          fileHeaders.forEach((header, index) => {
            rowObj[header] = values[index] !== undefined ? values[index] : '';
          });
          rows.push(rowObj);
        }

        if (rows.length === 0) {
          throw new Error('No valid data rows found in file.');
        }

        setParsedRows(rows);
      } catch (err: any) {
        console.error('CSV parse error:', err);
        setParseError(err.message || 'Failed to parse CSV file.');
        setParsedRows([]);
      }
    };

    reader.readAsText(file);
  };

  const handleUploadSubmit = async () => {
    if (parsedRows.length === 0) return;
    setIsSubmitting(true);
    try {
      await onImport(parsedRows);
      onClose();
    } catch (err) {
      console.error('Import submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alias map for precise column matching without cross-column collisions
  const FIELD_ALIASES: Record<string, string[]> = {
    house_number: ['house_number', 'house_no', 'houseno', 'hno', 'h_no', 'house', 'housenumber'],
    house_owner_name: ['house_owner_name', 'house_owner', 'owner_name', 'ownername', 'owner', 'head_name', 'headofhouse'],
    primary_contact_phone: ['primary_contact_phone', 'owner_phone', 'phone_number', 'phone', 'mobile_number', 'mobile', 'contact_number', 'contact'],
    area: ['area', 'cluster_or_area', 'cluster', 'ward', 'zone'],
    status: ['status', 'state'],
    name: ['name', 'member_name', 'full_name'],
    email: ['email', 'email_address', 'mail'],
    relationship: ['relationship', 'family_role', 'relation'],
    receipt_number: ['receipt_number', 'receipt_no', 'receiptno', 'ref_no', 'reference_number'],
    amount: ['amount', 'fee', 'total_amount', 'paid_amount'],
    payment_date: ['payment_date', 'date', 'txn_date'],
    payment_method: ['payment_method', 'method', 'pay_method', 'mode'],
    donor_name: ['donor_name', 'donor', 'contributor_name'],
    donation_date: ['donation_date', 'date'],
    groom_name: ['groom_name', 'groom', 'husband_name'],
    bride_name: ['bride_name', 'bride', 'wife_name'],
    nikah_date: ['nikah_date', 'marriage_date'],
    nikah_venue: ['nikah_venue', 'venue', 'location', 'place'],
    deceased_name: ['deceased_name', 'person_name'],
    date_of_death: ['date_of_death', 'death_date'],
    age: ['age', 'years'],
    gender: ['gender', 'sex'],
    place_of_death: ['place_of_death', 'place', 'location', 'hospital'],
  };

  // Precise column cell value lookup supporting exact keys, label matches, and unambiguous aliases
  const getCellValue = (row: Record<string, string>, col: ColumnGuide, _colIndex: number): string => {
    const targetKey = col.key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const targetLabel = col.label.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanTargetKey = col.key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTargetLabel = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');

    const aliases = FIELD_ALIASES[col.key] || [targetKey, targetLabel, cleanTargetKey, cleanTargetLabel];

    for (const [rKey, rVal] of Object.entries(row)) {
      const cleanRKey = rKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      const rawRKey = rKey.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!cleanRKey) continue;

      // Match exact key/label or unambiguous alias list
      if (
        rawRKey === targetKey ||
        rawRKey === targetLabel ||
        cleanRKey === cleanTargetKey ||
        cleanRKey === cleanTargetLabel ||
        aliases.some((a) => a.replace(/[^a-z0-9]/g, '') === cleanRKey)
      ) {
        if (rVal !== undefined && rVal !== null && String(rVal).trim() !== '') {
          return String(rVal).trim();
        }
      }
    }

    return '—';
  };

  const modalJSX = (
    <div className="global-confirm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="excel-import-dialog animate-scale-up">
        {/* MODAL HEADER */}
        <div className="excel-import-header">
          <div className="excel-import-title-group">
            <div className="excel-import-icon-box">
              <FileSpreadsheet size={22} className="text-emerald" />
            </div>
            <div>
              <h3 className="excel-import-title">{title}</h3>
              <p className="excel-import-subtitle">{subtitle}</p>
            </div>
          </div>
          <button className="excel-import-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="excel-import-body">
          {/* FILE STRUCTURE GUIDE BOX (SHOWN WHEN NO FILE OR FOR REFERENCE) */}
          {!selectedFile && (
            <div className="excel-structure-guide-card">
              <div className="guide-card-header">
                <FileSpreadsheet size={18} className="text-emerald" />
                <span>How to Structure Your Excel / CSV File</span>
              </div>
              <p className="guide-subtitle-text">Your Excel / CSV file should have the following columns:</p>

              {/* SAMPLE TABLE PREVIEW MATCHING USER IMAGE 1 */}
              <div className="excel-sample-table-wrap">
                <table className="excel-sample-table">
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th key={c.key}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {columns.map((c) => (
                        <td key={c.key}>{sampleRow[c.key] || c.example}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* COLUMN RULES LIST */}
              <ul className="excel-guide-rules-list">
                {columns.map((c) => (
                  <li key={c.key}>
                    <strong>{c.label}:</strong> {c.description}
                  </li>
                ))}
              </ul>

              {/* DOWNLOAD EXAMPLE FILE BUTTON */}
              <div className="margin-top-sm">
                <button type="button" className="excel-download-example-btn" onClick={handleDownloadSample}>
                  <Download size={15} />
                  <span>Download Example File</span>
                </button>
              </div>
            </div>
          )}

          {/* FILE PICKER BUTTON & PARSED STATUS BADGE */}
          <div className="excel-file-picker-row">
            <label className="excel-select-file-btn">
              <Upload size={16} />
              <span>{selectedFile ? 'Change File' : 'Select Excel / CSV File'}</span>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} hidden />
            </label>

            {selectedFile && (
              <div className="excel-valid-badge">
                <CheckCircle2 size={15} />
                <span>{parsedRows.length} Valid</span>
              </div>
            )}
          </div>

          {/* PARSE ERROR NOTIFICATION */}
          {parseError && (
            <div className="excel-parse-error-box">
              <AlertCircle size={16} />
              <span>{parseError}</span>
            </div>
          )}

          {/* PARSED PREVIEW TABLE MATCHING USER IMAGE 2 */}
          {selectedFile && parsedRows.length > 0 && (
            <div className="excel-preview-section">
              <h4 className="excel-preview-title">Preview ({parsedRows.length} {moduleName.toLowerCase()})</h4>

              <div className="excel-preview-table-wrap">
                <table className="excel-preview-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60, textAlign: 'center' }}>Status</th>
                      {columns.slice(0, 6).map((c) => (
                        <th key={c.key}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center' }}>
                          <span className="excel-status-check">
                            <Check size={14} />
                          </span>
                        </td>
                        {columns.slice(0, 6).map((c, cIdx) => (
                          <td key={c.key}>{getCellValue(row, c, cIdx)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <div className="font-xs color-subtle margin-top-xs text-center">
                  Showing first 10 of {parsedRows.length} records...
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="excel-import-footer">
          <button type="button" className="excel-footer-cancel-btn" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="excel-footer-upload-btn"
            onClick={handleUploadSubmit}
            disabled={parsedRows.length === 0 || isSubmitting || isLoading}
          >
            <Upload size={16} />
            <span>
              {isSubmitting
                ? 'Uploading...'
                : `Upload ${parsedRows.length > 0 ? parsedRows.length : 0} ${moduleName}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};

export default ExcelImportModal;
