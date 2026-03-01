import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import menuData from '../../data/menuData';

interface SearchEntry {
  title: string;
  path: string;
  breadcrumb: string; // e.g. "Main > Dashboard"
  icon?: string;
  iconType?: 'tabler' | 'feather';
}

/** Flatten the nested menuData into a flat list of searchable entries */
function buildSearchEntries(): SearchEntry[] {
  const entries: SearchEntry[] = [];

  const walk = (
    items: any[],
    breadcrumb: string,
    parentIcon?: string,
    parentIconType?: string
  ) => {
    for (const item of items) {
      const icon = item.icon || parentIcon;
      const iconType = item.iconType || parentIconType;

      if (item.path && item.path !== '#') {
        entries.push({
          title: item.title,
          path: item.path,
          breadcrumb,
          icon,
          iconType,
        });
      }

      if (item.children) {
        walk(item.children, `${breadcrumb} > ${item.title}`, icon, iconType);
      }
    }
  };

  for (const section of menuData) {
    walk(section.items, section.header);
  }

  return entries;
}

const MenuSearch: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const allEntries = useMemo(() => buildSearchEntries(), []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase().trim();
    const words = lower.split(/\s+/);
    return allEntries
      .filter((entry) => {
        const text = `${entry.title} ${entry.breadcrumb}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .slice(0, 10);
  }, [query, allEntries]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector('.search-result-item.active');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const goTo = useCallback(
    (path: string) => {
      navigate(path);
      setQuery('');
      setIsOpen(false);
      inputRef.current?.blur();
      document.body.classList.remove('slide-nav');
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        goTo(results[selectedIndex].path);
      }
    }
  };

  const renderIcon = (entry: SearchEntry) => {
    if (!entry.icon) return <i className="ti ti-file fs-16 me-2 text-muted"></i>;
    if (entry.iconType === 'feather') {
      return <i data-feather={entry.icon} className="feather-16 me-2"></i>;
    }
    return <i className={`ti ${entry.icon} fs-16 me-2`}></i>;
  };

  // Highlight matching text
  const highlightMatch = (text: string) => {
    if (!query.trim()) return text;
    const words = query.trim().split(/\s+/).filter(Boolean);
    const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-warning-subtle text-dark px-0">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <li className="nav-item nav-searchinputs">
      <div className="top-nav-search" ref={dropdownRef}>
        <a
          href="#"
          className="responsive-search"
          onClick={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
            setIsOpen(true);
          }}
        >
          <i className="fa fa-search"></i>
        </a>
        <div style={{ position: 'relative' }}>
          <div className="searchinputs input-group">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search menu..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
            />
            <div className="search-addon">
              <span>
                <i className="ti ti-search"></i>
              </span>
            </div>
            <span className="input-group-text">
              <kbd className="d-flex align-items-center">
                <img src="/assets/img/icons/command.svg" alt="" className="me-1" />K
              </kbd>
            </span>
          </div>

          {isOpen && (
            <div
              className="dropdown-menu search-dropdown show"
              style={{
                display: 'block',
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 1050,
                maxHeight: '400px',
                overflowY: 'auto',
              }}
              ref={resultsRef}
            >
              {query.trim() === '' ? (
                <div className="search-info">
                  <h6>
                    <span>
                      <i className="ti ti-search fs-16 me-1"></i>
                    </span>
                    Type to search menu items...
                  </h6>
                </div>
              ) : results.length === 0 ? (
                <div className="search-info">
                  <h6>
                    <span>
                      <i className="ti ti-mood-empty fs-16 me-1"></i>
                    </span>
                    No results found
                  </h6>
                  <p className="text-muted mb-0">
                    No menu items match "<strong>{query}</strong>"
                  </p>
                </div>
              ) : (
                <div className="search-info">
                  <h6>
                    <span>
                      <i className="ti ti-search fs-16 me-1"></i>
                    </span>
                    Results ({results.length})
                  </h6>
                  <ul className="search-tags" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {results.map((entry, i) => (
                      <li key={entry.path}>
                        <a
                          href={entry.path}
                          className={`search-result-item d-flex align-items-center px-3 py-2 text-decoration-none ${
                            i === selectedIndex ? 'active bg-primary-subtle' : ''
                          }`}
                          style={{
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            goTo(entry.path);
                          }}
                          onMouseEnter={() => setSelectedIndex(i)}
                        >
                          {renderIcon(entry)}
                          <div className="flex-grow-1">
                            <div className="fw-medium">{highlightMatch(entry.title)}</div>
                            <small className="text-muted">{entry.breadcrumb}</small>
                          </div>
                          {i === selectedIndex && (
                            <kbd className="ms-2 d-none d-md-inline-block" style={{ fontSize: '10px' }}>
                              Enter
                            </kbd>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export default MenuSearch;
