import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) {
  const { colors } = useTheme();

  const V = {
    fontDisplay: "'DM Sans', sans-serif",
    fontMono: "'JetBrains Mono', monospace",
  };

  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) pages.push(1, '...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) pages.push('...', totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginTop: '20px',
      '@media (max-width: 640px)': {
        gap: '8px',
      }
    }}>
      {/* Info Text */}
      <div style={{
        fontSize: '13px',
        color: colors.textMuted,
        fontFamily: V.fontMono,
        textAlign: 'center',
      }}>
        Showing {startItem} to {endItem} of {totalItems} items
      </div>

      {/* Pagination Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        flexWrap: 'wrap',
      }}>
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          style={{
            padding: '8px 12px',
            background: currentPage === 1 ? colors.surface2 : colors.surface,
            border: `1px solid ${currentPage === 1 ? colors.border2 : colors.border}`,
            borderRadius: '6px',
            color: currentPage === 1 ? colors.textDim : colors.text,
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: V.fontDisplay,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: currentPage === 1 ? '0.5' : '1',
          }}
          onMouseOver={(e) => {
            if (currentPage !== 1) {
              e.target.style.borderColor = colors.blue;
              e.target.style.color = colors.blue;
            }
          }}
          onMouseOut={(e) => {
            if (currentPage !== 1) {
              e.target.style.borderColor = colors.border;
              e.target.style.color = colors.text;
            }
          }}
        >
          ← Prev
        </button>

        {/* Page Numbers */}
        {pageNumbers.map((page, idx) => (
          page === '...' ? (
            <span key={`dots-${idx}`} style={{ color: colors.textDim, padding: '0 4px' }}>…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                padding: '8px 12px',
                background: page === currentPage ? colors.blue : colors.surface,
                border: `1px solid ${page === currentPage ? colors.blue : colors.border}`,
                borderRadius: '6px',
                color: page === currentPage ? '#fff' : colors.text,
                fontSize: '12px',
                fontWeight: page === currentPage ? '700' : '600',
                fontFamily: V.fontDisplay,
                cursor: 'pointer',
                transition: 'all 0.2s',
                minWidth: '36px',
              }}
              onMouseOver={(e) => {
                if (page !== currentPage) {
                  e.target.style.borderColor = colors.blue;
                  e.target.style.color = colors.blue;
                }
              }}
              onMouseOut={(e) => {
                if (page !== currentPage) {
                  e.target.style.borderColor = colors.border;
                  e.target.style.color = colors.text;
                }
              }}
            >
              {page}
            </button>
          )
        ))}

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          style={{
            padding: '8px 12px',
            background: currentPage === totalPages ? colors.surface2 : colors.surface,
            border: `1px solid ${currentPage === totalPages ? colors.border2 : colors.border}`,
            borderRadius: '6px',
            color: currentPage === totalPages ? colors.textDim : colors.text,
            fontSize: '12px',
            fontWeight: '600',
            fontFamily: V.fontDisplay,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            opacity: currentPage === totalPages ? '0.5' : '1',
          }}
          onMouseOver={(e) => {
            if (currentPage !== totalPages) {
              e.target.style.borderColor = colors.blue;
              e.target.style.color = colors.blue;
            }
          }}
          onMouseOut={(e) => {
            if (currentPage !== totalPages) {
              e.target.style.borderColor = colors.border;
              e.target.style.color = colors.text;
            }
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
