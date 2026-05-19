import { useState, useEffect, useMemo } from 'react';
import { FileText, Folder, ChevronRight, Search } from 'lucide-react';
import './DocumentBrowser.css';

type FileData = {
  id: string;
  name: string;
  type: 'markdown' | 'text' | 'code' | 'folder';
  path: string;
  children?: FileData[];
};

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: TreeNode[];
}

interface DocumentBrowserProps {
  nodes: TreeNode[];
  loading: boolean;
  error: string | null;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function DocumentBrowser({
  nodes,
  loading,
  error,
  selectedPath,
  onSelectFile,
}: DocumentBrowserProps) {
  const [filterType, setFilterType] = useState<'all' | 'markdown' | 'text' | 'code'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  const docExts = new Set(['.md', '.txt', '.doc', '.docx', '.pdf']);

  const filterNode = (node: TreeNode): FileData | null => {
    if (node.type === 'dir') {
      const children = (node.children || [])
        .map(filterNode)
        .filter((n): n is FileData => n !== null);
      if (children.length === 0) return null;
      return {
        id: node.path,
        name: node.name,
        type: 'folder',
        path: node.path,
        children,
      };
    }
    const ext = '.' + node.name.split('.').pop()?.toLowerCase();
    if (!docExts.has(ext)) return null;

    const fileType = ext === '.md' ? 'markdown' : ext === '.txt' ? 'text' : 'code';
    return {
      id: node.path,
      name: node.name,
      type: fileType,
      path: node.path,
    };
  };

  const filteredNodes = useMemo(() => {
    let result = (nodes || []).map(filterNode).filter((n): n is FileData => n !== null);

    if (filterType !== 'all') {
      result = result.filter(n => n.type === filterType || (n.type === 'folder' && n.children));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const filterRecursive = (items: FileData[]): FileData[] => {
        return items.reduce((acc: FileData[], item) => {
          if (item.name.toLowerCase().includes(q)) {
            acc.push(item);
          } else if (item.children) {
            const filteredChildren = filterRecursive(item.children);
            if (filteredChildren.length > 0) {
              acc.push({ ...item, children: filteredChildren });
            }
          }
          return acc;
        }, []);
      };
      result = filterRecursive(result);
    }

    return result;
  }, [nodes, filterType, searchQuery]);

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderItem = (item: FileData, depth: number = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedDirs.has(item.path);
    const isSelected = selectedPath === item.path;

    return (
      <div key={item.id}>
        <div
          className={`document-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (isFolder) {
              toggleDir(item.path);
            } else {
              onSelectFile(item.path);
            }
          }}
        >
          {isFolder ? (
            <span className="document-icon">
              <ChevronRight size={14} style={{ transform: isExpanded ? 'rotate(90deg)' : undefined }} />
              <Folder size={14} className="text-[#858585]" />
            </span>
          ) : (
            <span className="document-icon">
              <FileText size={14} className="text-[#858585]" />
            </span>
          )}
          <span className="document-name">{item.name}</span>
        </div>
        {isFolder && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="document-browser-container">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-browser-container">
        <div className="empty-state" style={{ color: '#ef4444' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="document-browser-container">
      <div className="document-browser-toolbar">
        <div className="breadcrumb">
          <span className="breadcrumb-item">Documents</span>
        </div>
      </div>

      <div className="document-browser-filters">
        {(['all', 'markdown', 'text', 'code'] as const).map(type => (
          <button
            key={type}
            className={`filter-btn ${filterType === type ? 'active' : ''}`}
            onClick={() => setFilterType(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
        <input
          type="text"
          className="search-box"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="document-list">
        {filteredNodes.length === 0 ? (
          <div className="empty-state">No documents found</div>
        ) : (
          filteredNodes.map(item => renderItem(item))
        )}
      </div>
    </div>
  );
}
