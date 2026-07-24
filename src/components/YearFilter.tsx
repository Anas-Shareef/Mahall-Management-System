import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { db, type SubscriptionYear } from '../services/db';

interface YearFilterProps {
  selectedYearId: string;
  onChange: (yearId: string) => void;
  years?: SubscriptionYear[];
  className?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export const YearFilter: React.FC<YearFilterProps> = ({
  selectedYearId,
  onChange,
  years,
  className = '',
  showAllOption = true,
  allOptionLabel = 'All Years',
}) => {
  const [yearList, setYearList] = useState<SubscriptionYear[]>(years || []);

  useEffect(() => {
    if (years && years.length > 0) {
      setYearList(years);
    } else {
      db.years.get().then(setYearList).catch(() => {});
    }
  }, [years]);

  return (
    <div className={`year-filter-pill ${className}`}>
      <Calendar size={15} className="calendar-icon" />
      <select
        value={selectedYearId}
        onChange={(e) => onChange(e.target.value)}
        className="year-filter-select"
        aria-label="Filter by subscription year"
      >
        {showAllOption && <option value="">{allOptionLabel}</option>}
        {yearList.map((y) => (
          <option key={y.id} value={y.id}>
            Year {y.year} (₹{y.default_fee})
          </option>
        ))}
      </select>

      <style>{`
        .year-filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          transition: var(--transition-all);
        }

        .calendar-icon {
          color: #00966b;
          flex-shrink: 0;
        }

        .year-filter-select {
          border: none;
          background: transparent;
          font-weight: 800;
          color: #00966b;
          cursor: pointer;
          font-size: 13px;
          outline: none;
        }

        .year-filter-select option {
          color: #111827;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default YearFilter;
