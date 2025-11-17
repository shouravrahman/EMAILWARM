'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload, 
  Users, 
  Mail, 
  MessageSquare, 
  Trash2, 
  Search,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';
import ProspectImport from '@/components/prospect-import';

interface ProspectList {
  id: string;
  name: string;
  source: 'csv' | 'google_sheets';
  total_prospects: number;
  active_prospects: number;
  created_at: string;
  stats: {
    total: number;
    active: number;
    contacted: number;
    replied: number;
  };
}

interface Prospect {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  status: string;
  last_contacted_at: string | null;
  created_at: string;
}

export default function ProspectsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ProspectList[]>([]);
  const [selectedList, setSelectedList] = useState<ProspectList | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    if (selectedList) {
      fetchProspects(selectedList.id, currentPage, searchTerm);
    }
  }, [selectedList, currentPage, searchTerm]);

  const fetchLists = async () => {
    try {
      const response = await fetch('/api/prospects/lists');
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProspects = async (listId: string, page: number, search: string) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/prospects/lists/${listId}?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProspects(data.prospects || []);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching prospects:', error);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this prospect list? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/prospects/lists?listId=${listId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLists(lists.filter(list => list.id !== listId));
        if (selectedList?.id === listId) {
          setSelectedList(null);
          setProspects([]);
        }
      }
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  const handleImportComplete = () => {
    setShowImportModal(false);
    fetchLists();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prospect Lists</h1>
            <p className="text-gray-600 mt-2">
              Manage your prospect lists and outreach campaigns
            </p>
          </div>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Import Prospects
          </button>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Import Prospects</h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <ProspectImport onImportComplete={handleImportComplete} />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lists Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Your Lists ({lists.length})
              </h2>
              
              {lists.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">No prospect lists yet</p>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Import your first list
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedList?.id === list.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedList(list);
                        setCurrentPage(1);
                        setSearchTerm('');
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{list.name}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteList(list.id);
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{list.stats.total}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>{list.stats.contacted}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prospects Detail */}
          <div className="lg:col-span-2">
            {selectedList ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* List Header */}
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {selectedList.name}
                  </h2>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedList.stats.total}
                      </div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedList.stats.active}
                      </div>
                      <div className="text-sm text-gray-600">Active</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedList.stats.contacted}
                      </div>
                      <div className="text-sm text-gray-600">Contacted</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedList.stats.replied}
                      </div>
                      <div className="text-sm text-gray-600">Replied</div>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search prospects..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Prospects Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Last Contacted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {prospects.map((prospect) => (
                        <tr key={prospect.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">
                                {prospect.first_name} {prospect.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{prospect.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm text-gray-900">{prospect.company || '-'}</div>
                              <div className="text-sm text-gray-500">{prospect.title || '-'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              prospect.status === 'replied' ? 'bg-green-100 text-green-800' :
                              prospect.status === 'engaged' ? 'bg-blue-100 text-blue-800' :
                              prospect.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {prospect.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {prospect.last_contacted_at
                              ? new Date(prospect.last_contacted_at).toLocaleDateString()
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-6 border-t border-gray-200 flex justify-between items-center">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a prospect list
                </h3>
                <p className="text-gray-600">
                  Choose a list from the sidebar to view prospects
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
