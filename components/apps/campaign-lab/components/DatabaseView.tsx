import React, { useState, useMemo, useCallback } from 'react';
import {
  Block, DatabaseSchema, DatabaseRow, DatabaseProperty, DatabaseViewConfig,
  ViewFilter, ViewSort, SelectOption, PropertyType, PropertyValue,
} from '@/lib/campaign-types';
import { SELECT_COLORS } from '@/lib/campaign-data';
import {
  Database, Columns, LayoutList, Clock, Calendar, Plus, GalleryHorizontal,
  Filter, SortAsc, SortDesc, X, ChevronDown, GripVertical, Trash2,
  CheckSquare, Square, ExternalLink, Link2, Edit3, Eye, EyeOff,
  Search, SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Property Cell Renderers ────────────────────────────────

function SelectCell({ value, options, onUpdate }: { value: string | null; options: SelectOption[]; onUpdate: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  const colorClass = selected ? SELECT_COLORS[selected.color] || 'bg-slate-100 text-slate-700' : '';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn("px-2 py-0.5 rounded text-xs font-medium transition-colors", selected ? colorClass : "bg-slate-50 text-slate-400 hover:bg-slate-100")}
      >
        {selected?.name || 'Empty'}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-black/10 shadow-xl rounded-lg p-2 w-40 flex flex-col gap-1">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onUpdate(opt.id); setOpen(false); }}
              className={cn("px-2 py-1 rounded text-xs font-medium text-left hover:opacity-80", SELECT_COLORS[opt.color] || 'bg-slate-100 text-slate-700')}
            >
              {opt.name}
            </button>
          ))}
          <button onClick={() => { onUpdate(''); setOpen(false); }} className="px-2 py-1 text-xs text-slate-400 hover:bg-slate-50 text-left rounded">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function TextCell({ value, placeholder, onUpdate }: { value: string | null; placeholder?: string; onUpdate: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || '');

  if (editing) {
    return (
      <input
        autoFocus
        className="w-full text-sm outline-none bg-white border border-blue-300 rounded px-1 py-0.5"
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={() => { onUpdate(temp); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onUpdate(temp); setEditing(false); } }}
      />
    );
  }

  return (
    <div
      className={cn("text-sm cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 min-h-[24px]", value ? "text-[#37352f]" : "text-[#37352f]/30")}
      onClick={() => { setTemp(value || ''); setEditing(true); }}
    >
      {value || placeholder || 'Empty'}
    </div>
  );
}

function NumberCell({ value, onUpdate }: { value: number | null; onUpdate: (v: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value != null ? String(value) : '');

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        className="w-24 text-sm outline-none bg-white border border-blue-300 rounded px-1 py-0.5"
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={() => { onUpdate(temp ? Number(temp) : null); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onUpdate(temp ? Number(temp) : null); setEditing(false); } }}
      />
    );
  }

  return (
    <div
      className="text-sm cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 min-h-[24px] text-[#37352f]"
      onClick={() => { setTemp(value != null ? String(value) : ''); setEditing(true); }}
    >
      {value != null ? value : '—'}
    </div>
  );
}

function CheckboxCell({ value, onUpdate }: { value: boolean | null; onUpdate: (v: boolean) => void }) {
  const checked = value === true;
  return (
    <div className="cursor-pointer flex items-center" onClick={() => onUpdate(!checked)}>
      {checked ? <CheckSquare className="w-4 h-4 text-blue-500" /> : <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />}
    </div>
  );
}

function DateCell({ value, onUpdate }: { value: string | null; onUpdate: (v: string) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        className="text-sm outline-none bg-white border border-blue-300 rounded px-1 py-0.5"
        value={value || ''}
        onChange={e => onUpdate(e.target.value)}
        onBlur={() => setEditing(false)}
      />
    );
  }

  return (
    <div
      className="text-sm cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 min-h-[24px] text-[#37352f]/70"
      onClick={() => setEditing(true)}
    >
      {value || '—'}
    </div>
  );
}

function UrlCell({ value, onUpdate }: { value: string | null; onUpdate: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || '');

  if (editing) {
    return (
      <input
        autoFocus
        className="w-full text-sm outline-none bg-white border border-blue-300 rounded px-1 py-0.5"
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={() => { onUpdate(temp); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onUpdate(temp); setEditing(false); } }}
      />
    );
  }

  if (value) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 underline flex items-center gap-1 px-1 py-0.5">
        <ExternalLink className="w-3 h-3" /> Link
      </a>
    );
  }

  return (
    <div className="text-sm text-[#37352f]/30 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 min-h-[24px]" onClick={() => { setTemp(value || ''); setEditing(true); }}>
      —
    </div>
  );
}

function PersonCell({ value, onUpdate }: { value: string | null; onUpdate: (v: string) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        className="w-full text-sm outline-none bg-white border border-blue-300 rounded px-1 py-0.5"
        value={value || ''}
        onChange={e => onUpdate(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }}
      />
    );
  }

  if (value) {
    const initials = value.replace('@', '').substring(0, 2).toUpperCase();
    return (
      <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setEditing(true)}>
        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">{initials}</div>
        <span className="text-sm text-blue-600">{value}</span>
      </div>
    );
  }

  return (
    <div className="text-sm text-[#37352f]/30 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 min-h-[24px]" onClick={() => setEditing(true)}>
      Unassigned
    </div>
  );
}

function AutoCell({ label }: { label: string }) {
  return <div className="text-xs text-[#37352f]/40 italic">{label}</div>;
}

function PropertyCell({
  property, value, rowId, onUpdateRow, database
}: {
  property: DatabaseProperty;
  value: PropertyValue;
  rowId: string;
  onUpdateRow: (rowId: string, propertyId: string, value: PropertyValue) => void;
  database: DatabaseSchema;
}) {
  const handleUpdate = (v: PropertyValue) => onUpdateRow(rowId, property.id, v);

  switch (property.type) {
    case 'select':
      return <SelectCell value={value as string | null} options={property.options || []} onUpdate={v => handleUpdate(v)} />;
    case 'multi-select':
      return <TextCell value={(value as string[])?.join(', ') || null} placeholder="Select..." onUpdate={v => handleUpdate(v.split(', ').filter(Boolean))} />;
    case 'checkbox':
      return <CheckboxCell value={value as boolean | null} onUpdate={v => handleUpdate(v)} />;
    case 'number':
      return <NumberCell value={value as number | null} onUpdate={v => handleUpdate(v)} />;
    case 'date':
      return <DateCell value={value as string | null} onUpdate={v => handleUpdate(v)} />;
    case 'url':
      return <UrlCell value={value as string | null} onUpdate={v => handleUpdate(v)} />;
    case 'person':
      return <PersonCell value={value as string | null} onUpdate={v => handleUpdate(v)} />;
    case 'email':
      return <TextCell value={value as string | null} placeholder="email@example.com" onUpdate={v => handleUpdate(v)} />;
    case 'phone':
      return <TextCell value={value as string | null} placeholder="+1 (555)..." onUpdate={v => handleUpdate(v)} />;
    case 'relation':
      return <TextCell value={value as string | null} placeholder="Link to record..." onUpdate={v => handleUpdate(v)} />;
    case 'created-time':
      return <AutoCell label="Auto" />;
    case 'last-edited-time':
      return <AutoCell label="Auto" />;
    case 'created-by':
      return <AutoCell label="Auto" />;
    case 'last-edited-by':
      return <AutoCell label="Auto" />;
    case 'text':
    default:
      return <TextCell value={value as string | null} onUpdate={v => handleUpdate(v)} />;
  }
}

// ─── Filter & Sort Panel ────────────────────────────────────

function FilterSortPanel({
  config, properties, onUpdateConfig, onClose
}: {
  config: DatabaseViewConfig;
  properties: DatabaseProperty[];
  onUpdateConfig: (config: DatabaseViewConfig) => void;
  onClose: () => void;
}) {
  const addFilter = () => {
    const firstProp = properties[0];
    if (!firstProp) return;
    onUpdateConfig({
      ...config,
      filters: [...config.filters, { propertyId: firstProp.id, operator: 'is', value: null }],
    });
  };

  const updateFilter = (idx: number, updates: Partial<ViewFilter>) => {
    const newFilters = [...config.filters];
    newFilters[idx] = { ...newFilters[idx]!, ...updates };
    onUpdateConfig({ ...config, filters: newFilters });
  };

  const removeFilter = (idx: number) => {
    onUpdateConfig({ ...config, filters: config.filters.filter((_, i) => i !== idx) });
  };

  const addSort = () => {
    const firstProp = properties[0];
    if (!firstProp) return;
    onUpdateConfig({
      ...config,
      sorts: [...config.sorts, { propertyId: firstProp.id, direction: 'ascending' }],
    });
  };

  const updateSort = (idx: number, direction: 'ascending' | 'descending') => {
    const newSorts = [...config.sorts];
    newSorts[idx] = { ...newSorts[idx]!, direction };
    onUpdateConfig({ ...config, sorts: newSorts });
  };

  const removeSort = (idx: number) => {
    onUpdateConfig({ ...config, sorts: config.sorts.filter((_, i) => i !== idx) });
  };

  const toggleHideProperty = (propId: string) => {
    const hidden = config.hiddenProperties.includes(propId)
      ? config.hiddenProperties.filter(id => id !== propId)
      : [...config.hiddenProperties, propId];
    onUpdateConfig({ ...config, hiddenProperties: hidden });
  };

  return (
    <div className="bg-white border border-black/10 shadow-xl rounded-xl p-4 w-80 z-50 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Filter & Sort</span>
        <button onClick={onClose} className="p-1 hover:bg-black/5 rounded"><X className="w-4 h-4" /></button>
      </div>

      {/* Filters */}
      <div>
        <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">Filters</div>
        {config.filters.map((f, idx) => {
          const prop = properties.find(p => p.id === f.propertyId);
          return (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <select
                className="text-xs border border-black/10 rounded px-2 py-1 bg-white"
                value={f.propertyId}
                onChange={e => updateFilter(idx, { propertyId: e.target.value })}
              >
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select
                className="text-xs border border-black/10 rounded px-2 py-1 bg-white"
                value={f.operator}
                onChange={e => updateFilter(idx, { operator: e.target.value as ViewFilter['operator'] })}
              >
                <option value="is">Is</option>
                <option value="is-not">Is Not</option>
                <option value="contains">Contains</option>
                <option value="does-not-contain">Does not contain</option>
                <option value="is-empty">Is Empty</option>
                <option value="is-not-empty">Is Not Empty</option>
              </select>
              {f.operator !== 'is-empty' && f.operator !== 'is-not-empty' && (
                <input
                  className="text-xs border border-black/10 rounded px-2 py-1 w-20"
                  value={f.value as string || ''}
                  onChange={e => updateFilter(idx, { value: e.target.value })}
                  placeholder="Value..."
                />
              )}
              <button onClick={() => removeFilter(idx)} className="p-1 hover:bg-black/5 rounded"><X className="w-3 h-3 text-[#37352f]/40" /></button>
            </div>
          );
        })}
        <button onClick={addFilter} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add filter
        </button>
      </div>

      {/* Sorts */}
      <div>
        <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">Sorts</div>
        {config.sorts.map((s, idx) => {
          const prop = properties.find(p => p.id === s.propertyId);
          return (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <select
                className="text-xs border border-black/10 rounded px-2 py-1 bg-white"
                value={s.propertyId}
                onChange={e => updateSort(idx, s.direction)}
                onBlur={e => {
                  const newSorts = [...config.sorts];
                  newSorts[idx] = { ...newSorts[idx]!, propertyId: e.target.value };
                  onUpdateConfig({ ...config, sorts: newSorts });
                }}
              >
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button
                onClick={() => updateSort(idx, s.direction === 'ascending' ? 'descending' : 'ascending')}
                className="flex items-center gap-1 text-xs px-2 py-1 border border-black/10 rounded hover:bg-black/5"
              >
                {s.direction === 'ascending' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                {s.direction === 'ascending' ? 'Ascending' : 'Descending'}
              </button>
              <button onClick={() => removeSort(idx)} className="p-1 hover:bg-black/5 rounded"><X className="w-3 h-3 text-[#37352f]/40" /></button>
            </div>
          );
        })}
        <button onClick={addSort} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add sort
        </button>
      </div>

      {/* Hidden Properties */}
      <div>
        <div className="text-xs font-semibold text-[#37352f]/50 uppercase tracking-wider mb-2">Visible Properties</div>
        {properties.map(p => (
          <div key={p.id} className="flex items-center gap-2 mb-1">
            <button onClick={() => toggleHideProperty(p.id)} className={cn(
              "p-1 rounded", config.hiddenProperties.includes(p.id) ? "text-[#37352f]/30" : "text-blue-500"
            )}>
              {config.hiddenProperties.includes(p.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <span className={cn("text-xs", config.hiddenProperties.includes(p.id) ? "text-[#37352f]/30" : "text-[#37352f]")}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main DatabaseView ──────────────────────────────────────

interface DatabaseViewProps {
  block: Block;
  databaseStore: Record<string, DatabaseSchema>;
  onUpdateDatabase: (dbId: string, updates: Partial<DatabaseSchema>) => void;
  onUpdateBlock: (updates: Partial<Block>) => void;
}

export function DatabaseView({ block, databaseStore, onUpdateDatabase, onUpdateBlock }: DatabaseViewProps) {
  const dbId = block.databaseId;
  const database = dbId ? databaseStore[dbId] : null;

  // If no database linked, show placeholder to pick or create one
  if (!database) {
    return <EmptyDatabasePlaceholder databaseStore={databaseStore} onSelectDb={(id) => onUpdateBlock({ databaseId: id })} />;
  }

  const config = block.databaseViewConfig || { viewType: 'table', filters: [], sorts: [], hiddenProperties: [] };
  const visibleProperties = database.properties.filter(p => !config.hiddenProperties.includes(p.id));

  // Apply filters & sorts to rows
  const filteredRows = useMemo(() => {
    let rows = [...database.rows];

    // Filters
    for (const f of config.filters) {
      const prop = database.properties.find(p => p.id === f.propertyId);
      if (!prop) continue;

      rows = rows.filter(row => {
        const val = row.properties[f.propertyId];

        switch (f.operator) {
          case 'is': return val === f.value || (val == null && f.value == null);
          case 'is-not': return val !== f.value;
          case 'contains': return typeof val === 'string' && val.includes(f.value as string || '');
          case 'does-not-contain': return typeof val === 'string' && !val.includes(f.value as string || '');
          case 'is-empty': return val == null || val === '' || val === false;
          case 'is-not-empty': return val != null && val !== '' && val !== false;
          default: return true;
        }
      });
    }

    // Sorts
    for (const s of config.sorts) {
      rows.sort((a, b) => {
        const aVal = a.properties[s.propertyId];
        const bVal = b.properties[s.propertyId];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return s.direction === 'ascending' ? -1 : 1;
        if (bVal == null) return s.direction === 'ascending' ? 1 : -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return s.direction === 'ascending' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal);
        const bStr = String(bVal);
        return s.direction === 'ascending' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return rows;
  }, [database.rows, config.filters, config.sorts, database.properties]);

  const [view, setView] = useState<DatabaseViewConfig['viewType']>(config.viewType);
  const [filterPanel, setFilterPanel] = useState(false);

  const handleViewChange = (vt: DatabaseViewConfig['viewType']) => {
    setView(vt);
    onUpdateBlock({ databaseViewConfig: { ...config, viewType: vt } });
  };

  const handleUpdateRow = (rowId: string, propertyId: string, value: PropertyValue) => {
    const newRows = database.rows.map(r =>
      r.id === rowId ? { ...r, properties: { ...r.properties, [propertyId]: value } } : r
    );
    onUpdateDatabase(dbId!, { rows: newRows });
  };

  const addRow = () => {
    const newRow: DatabaseRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      properties: Object.fromEntries(database.properties.map(p => [p.id, null])),
    };
    onUpdateDatabase(dbId!, { rows: [...database.rows, newRow] });
  };

  const deleteRow = (rowId: string) => {
    onUpdateDatabase(dbId!, { rows: database.rows.filter(r => r.id !== rowId) });
  };

  const addProperty = () => {
    const newProp: DatabaseProperty = {
      id: `prop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: 'New Property',
      type: 'text',
    };
    const newRows = database.rows.map(r => ({ ...r, properties: { ...r.properties, [newProp.id]: null } }));
    onUpdateDatabase(dbId!, { properties: [...database.properties, newProp], rows: newRows });
  };

  const renameProperty = (propId: string, name: string) => {
    const newProps = database.properties.map(p => p.id === propId ? { ...p, name } : p);
    onUpdateDatabase(dbId!, { properties: newProps });
  };

  const deleteProperty = (propId: string) => {
    const newProps = database.properties.filter(p => p.id !== propId);
    const newRows = database.rows.map(r => {
      const newPropsMap = { ...r.properties };
      delete newPropsMap[propId];
      return { ...r, properties: newPropsMap };
    });
    onUpdateDatabase(dbId!, { properties: newProps, rows: newRows });
  };

  const boardGroupProp = config.boardGroupProperty || database.properties.find(p => p.type === 'select')?.id || 'prop-status';
  const boardGroupOptions = database.properties.find(p => p.id === boardGroupProp)?.options || [];

  const ViewIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    table: Database, board: Columns, list: LayoutList, gallery: GalleryHorizontal, timeline: Clock, calendar: Calendar,
  };

  return (
    <div className="border border-black/10 rounded-xl overflow-hidden my-4 text-sm font-sans bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative group/db">
      {/* Header */}
      <div className="flex items-center gap-1 p-2 border-b border-black/5 bg-slate-50">
        <span className="text-lg mr-1">{database.icon}</span>
        <span className="font-semibold text-sm text-[#37352f] mr-3">{database.name}</span>

        {/* View Tabs */}
        {[
          { id: 'table', label: 'Table', Icon: Database },
          { id: 'board', label: 'Board', Icon: Columns },
          { id: 'list', label: 'List', Icon: LayoutList },
          { id: 'gallery', label: 'Gallery', Icon: GalleryHorizontal },
          { id: 'timeline', label: 'Timeline', Icon: Clock },
          { id: 'calendar', label: 'Calendar', Icon: Calendar },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => handleViewChange(v.id as DatabaseViewConfig['viewType'])}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
              view === v.id ? 'bg-white shadow-sm border border-black/5 text-[#37352f]' : 'hover:bg-black/5 text-[#37352f]/60'
            )}
          >
            <v.Icon className="w-3.5 h-3.5" />
            {v.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* Filter/Sort Toggle */}
        <button
          onClick={() => setFilterPanel(!filterPanel)}
          className={cn("px-2 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
            (config.filters.length > 0 || config.sorts.length > 0) ? "bg-blue-50 text-blue-600" : "hover:bg-black/5 text-[#37352f]/60"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {config.filters.length > 0 && <span className="bg-blue-500 text-white px-1.5 rounded text-[10px]">{config.filters.length}</span>}
        </button>

        {/* New Row */}
        <button onClick={addRow} className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-sm font-medium">
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {/* Filter Panel */}
      {filterPanel && (
        <div className="absolute top-12 right-2 z-50">
          <FilterSortPanel
            config={config}
            properties={database.properties}
            onUpdateConfig={(newConfig) => { onUpdateBlock({ databaseViewConfig: newConfig }); }}
            onClose={() => setFilterPanel(false)}
          />
        </div>
      )}

      {/* View Content */}
      <div className="p-1">
        {/* TABLE VIEW */}
        {view === 'table' && (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 border-b border-black/5 w-8">
                    <button onClick={addProperty} className="text-[#37352f]/30 hover:text-[#37352f]/60"><Plus className="w-4 h-4" /></button>
                  </th>
                  {visibleProperties.map(prop => (
                    <th key={prop.id} className="p-3 border-b border-black/5 font-medium text-[#37352f]/50 whitespace-nowrap bg-slate-50/50 text-xs uppercase tracking-wider group/th relative">
                      <EditableColumnName name={prop.name} onRename={(name) => renameProperty(prop.id, name)} />
                      <span className="ml-1 text-[10px] text-[#37352f]/30 lowercase">{prop.type}</span>
                      <button onClick={() => deleteProperty(prop.id)} className="absolute right-1 top-1 p-0.5 opacity-0 group-hover/th:opacity-100 hover:bg-red-50 rounded text-red-400 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => (
                  <tr key={row.id} className="border-b border-black/5 last:border-0 hover:bg-slate-50/50 transition-colors group/row">
                    <td className="p-1 w-8">
                      <button onClick={() => deleteRow(row.id)} className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-red-50 rounded text-red-400 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                    {visibleProperties.map(prop => (
                      <td key={prop.id} className="p-2 whitespace-nowrap">
                        <PropertyCell
                          property={prop}
                          value={row.properties[prop.id] ?? null}
                          rowId={row.id}
                          onUpdateRow={handleUpdateRow}
                          database={database}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Add row row */}
                <tr className="hover:bg-slate-50/30">
                  <td className="p-2 w-8"></td>
                  <td className="p-2">
                    <button onClick={addRow} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> New
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* BOARD VIEW */}
        {view === 'board' && (
          <div className="p-4 flex gap-4 overflow-x-auto min-h-[300px] bg-[#f7f7f5] rounded-b-lg">
            {boardGroupOptions.map(opt => {
              const groupRows = filteredRows.filter(r => r.properties[boardGroupProp] === opt.id);
              const colorClass = SELECT_COLORS[opt.color] || 'bg-slate-100 text-slate-700';
              return (
                <div key={opt.id} className="flex-1 min-w-[240px] max-w-[280px]">
                  <div className="font-medium text-[#37352f]/70 mb-3 px-1 flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", colorClass)}>{opt.name}</span>
                    <span className="text-black/30 bg-black/5 px-1.5 rounded text-xs">{groupRows.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {groupRows.map(row => (
                      <div key={row.id} className="bg-white p-3 border border-black/5 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab group/card relative">
                        <button onClick={() => deleteRow(row.id)} className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 p-1 hover:bg-red-50 rounded text-red-400 transition-opacity">
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="font-medium mb-2 text-[#37352f]">
                          {String(row.properties[database.properties[0]!.id] || 'Untitled')}
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-black/5">
                          {visibleProperties.filter(p => p.id !== database.properties[0]?.id && p.id !== boardGroupProp).slice(0, 3).map(prop => (
                            <div key={prop.id} className="text-xs text-[#37352f]/40 flex items-center gap-1">
                              {prop.type === 'person' ? (
                                <PersonCell value={row.properties[prop.id] as string | null} onUpdate={v => handleUpdateRow(row.id, prop.id, v)} />
                              ) : prop.type === 'date' ? (
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {row.properties[prop.id] || ''}</span>
                              ) : (
                                <PropertyCell property={prop} value={row.properties[prop.id] ?? null} rowId={row.id} onUpdateRow={handleUpdateRow} database={database} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={addRow} className="border border-dashed border-black/10 hover:border-black/30 rounded-lg p-2 text-xs text-[#37352f]/40 flex items-center justify-center gap-1 hover:bg-white transition-colors">
                      <Plus className="w-3 h-3" /> New
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="flex flex-col p-2">
            {filteredRows.map(row => (
              <div key={row.id} className="flex items-center justify-between p-3 border-b border-black/5 hover:bg-slate-50 transition-colors rounded-lg group/row">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {visibleProperties.find(p => p.type === 'checkbox') && (
                    <CheckboxCell
                      value={row.properties[visibleProperties.find(p => p.type === 'checkbox')!.id] as boolean | null}
                      onUpdate={v => handleUpdateRow(row.id, visibleProperties.find(p => p.type === 'checkbox')!.id, v)}
                    />
                  )}
                  <span className={cn(
                    "font-medium truncate",
                    row.properties[visibleProperties.find(p => p.type === 'checkbox')?.id || ''] === true ? "line-through text-slate-400" : "text-[#37352f]"
                  )}>
                    {String(row.properties[database.properties[0]!.id] || 'Untitled')}
                  </span>
                </div>
                <div className="flex items-center gap-3 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                  {visibleProperties.slice(1, 4).map(prop => (
                    <PropertyCell key={prop.id} property={prop} value={row.properties[prop.id] ?? null} rowId={row.id} onUpdateRow={handleUpdateRow} database={database} />
                  ))}
                  <button onClick={() => deleteRow(row.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
            <button onClick={addRow} className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 p-3">
              <Plus className="w-3 h-3" /> New row
            </button>
          </div>
        )}

        {/* GALLERY VIEW */}
        {view === 'gallery' && (
          <div className="p-4 bg-[#f7f7f5] rounded-b-lg">
            <div className="grid grid-cols-3 gap-3 min-h-[300px]">
              {filteredRows.map(row => {
                const nameProp = database.properties[0]!.id;
                const statusProp = database.properties.find(p => p.type === 'select');
                const statusVal = statusProp ? row.properties[statusProp.id] as string : null;
                const statusOpt = statusProp?.options?.find(o => o.id === statusVal);
                const colorClass = statusOpt ? SELECT_COLORS[statusOpt.color] : 'bg-slate-100 text-slate-700';

                return (
                  <div key={row.id} className="bg-white border border-black/5 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer group/card relative">
                    <button onClick={() => deleteRow(row.id)} className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 p-1.5 bg-black/60 rounded text-white transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className={cn(
                      "h-32 flex items-center justify-center text-2xl font-bold text-white",
                      statusOpt?.color === 'green' ? "bg-gradient-to-br from-emerald-400 to-emerald-600" :
                      statusOpt?.color === 'blue' ? "bg-gradient-to-br from-blue-400 to-blue-600" :
                      statusOpt?.color === 'amber' ? "bg-gradient-to-br from-amber-400 to-amber-600" :
                      statusOpt?.color === 'red' ? "bg-gradient-to-br from-red-400 to-rose-600" :
                      "bg-gradient-to-br from-slate-300 to-slate-400"
                    )}>
                      {String(row.properties[nameProp] || 'Untitled').split(' ').map(w => w[0]).join('').substring(0, 3)}
                    </div>
                    <div className="p-3">
                      <div className="font-medium text-[#37352f] mb-2">{String(row.properties[nameProp] || 'Untitled')}</div>
                      <div className="flex items-center gap-2 mt-2">
                        {statusOpt && <span className={cn("px-2 py-0.5 rounded text-xs font-medium", colorClass)}>{statusOpt.name}</span>}
                        {visibleProperties.filter(p => p.id !== nameProp && p.id !== statusProp?.id).slice(0, 2).map(prop => (
                          <span key={prop.id} className="text-xs text-[#37352f]/40">{String(row.properties[prop.id] || '—')}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              <button onClick={addRow} className="bg-white/50 border border-black/5 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm transition-all cursor-pointer min-h-[200px]">
                <div className="text-center text-[#37352f]/30">
                  <Plus className="w-8 h-8 mx-auto mb-1" />
                  <span className="text-xs">New card</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <div className="p-4 bg-white border-t border-black/5 min-h-[400px]">
            <div className="grid grid-cols-7 gap-px bg-black/5 border border-black/5 rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-slate-50 p-2 text-center text-xs font-semibold text-black/50 uppercase tracking-wider">{day}</div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => {
                const dayNum = i - 2 > 0 && i - 2 <= 31 ? i - 2 : null;
                const dateProp = database.properties.find(p => p.type === 'date');
                const dayItems = dateProp ? filteredRows.filter(r => {
                  const dateVal = r.properties[dateProp.id] as string;
                  return dateVal && dateVal.includes(dayNum?.toString() || 'xx');
                }) : [];

                return (
                  <div key={i} className="bg-white min-h-[100px] p-2 hover:bg-slate-50 transition-colors">
                    {dayNum && <div className="text-sm text-black/40 font-medium mb-1">{dayNum}</div>}
                    <div className="flex flex-col gap-1">
                      {dayItems.map(r => {
                        const nameProp = database.properties[0]!.id;
                        const statusProp = database.properties.find(p => p.type === 'select');
                        const statusVal = statusProp ? r.properties[statusProp.id] as string : null;
                        const statusOpt = statusProp?.options?.find(o => o.id === statusVal);
                        const colorClass = statusOpt ? SELECT_COLORS[statusOpt.color] : 'bg-slate-100 text-slate-700';
                        return (
                          <div key={r.id} className={cn("text-[10px] px-1.5 py-1 rounded font-medium truncate cursor-pointer hover:opacity-80", colorClass)}>
                            {String(r.properties[nameProp] || '')}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TIMELINE VIEW */}
        {view === 'timeline' && (
          <div className="p-4 bg-white border-t border-black/5 overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="flex border-b border-black/5 pb-2 mb-4">
                <div className="w-48 shrink-0 font-medium text-xs text-black/50 uppercase tracking-wider pl-2">Task</div>
                <div className="flex-1 flex justify-between text-xs text-black/40 font-medium px-4">
                  <span>Start</span>
                  <span>Mid</span>
                  <span>End</span>
                </div>
              </div>
              {filteredRows.map((r, i) => {
                const nameProp = database.properties[0]!.id;
                const statusProp = database.properties.find(p => p.type === 'select');
                const statusVal = statusProp ? r.properties[statusProp.id] as string : null;
                const statusOpt = statusProp?.options?.find(o => o.id === statusVal);
                const startPct = 10 + (i * 15) % 60;
                const widthPct = 15 + (i * 8) % 30;

                return (
                  <div key={r.id} className="flex items-center group cursor-pointer mb-2">
                    <div className="w-48 shrink-0 text-sm font-medium text-[#37352f] truncate pr-4 pl-2 group-hover:text-blue-600 transition-colors">
                      {String(r.properties[nameProp] || 'Untitled')}
                    </div>
                    <div className="flex-1 relative h-8 bg-slate-50 rounded-lg overflow-hidden border border-black/5">
                      <div
                        className={cn(
                          "absolute top-1 bottom-1 rounded-md flex items-center px-2 text-[10px] font-bold text-white shadow-sm hover:scale-[1.02] transition-transform cursor-pointer",
                          statusOpt?.color === 'green' ? "bg-emerald-500" :
                          statusOpt?.color === 'blue' ? "bg-blue-500" :
                          statusOpt?.color === 'amber' ? "bg-amber-500" :
                          statusOpt?.color === 'red' ? "bg-red-500" :
                          "bg-slate-400"
                        )}
                        style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                      >
                        <span className="truncate">{String(r.properties[database.properties.find(p => p.type === 'person')?.id || ''] || '')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editable Column Name ───────────────────────────────────

function EditableColumnName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(name);

  if (editing) {
    return (
      <input
        autoFocus
        className="text-xs font-medium outline-none bg-white border border-blue-300 rounded px-1 w-24"
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={() => { onRename(temp); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onRename(temp); setEditing(false); } }}
      />
    );
  }

  return (
    <span className="cursor-pointer hover:text-[#37352f]" onDoubleClick={() => { setTemp(name); setEditing(true); }}>{name}</span>
  );
}

// ─── Empty Database Placeholder ──────────────────────────────

function EmptyDatabasePlaceholder({
  databaseStore, onSelectDb
}: {
  databaseStore: Record<string, DatabaseSchema>;
  onSelectDb: (dbId: string) => void;
}) {
  const availableDbs = Object.values(databaseStore);

  return (
    <div className="border border-black/10 rounded-xl overflow-hidden my-4 bg-slate-50 p-6 text-center">
      <Database className="w-8 h-8 text-[#37352f]/30 mx-auto mb-3" />
      <div className="font-medium text-[#37352f] mb-2">No database linked</div>
      <div className="text-sm text-[#37352f]/50 mb-4">Link an existing database or create a new one.</div>
      {availableDbs.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {availableDbs.map(db => (
            <button
              key={db.id}
              onClick={() => onSelectDb(db.id)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-black/5 rounded-lg hover:border-blue-300 text-sm text-left transition-colors"
            >
              <span className="text-lg">{db.icon}</span>
              <span className="font-medium text-[#37352f]">{db.name}</span>
              <span className="text-xs text-[#37352f]/40 ml-auto">{db.rows.length} rows</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
