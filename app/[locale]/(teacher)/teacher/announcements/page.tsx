'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/Dialog';
import { AnnouncementEditor } from '@/app/components/teacher/AnnouncementEditor';

interface Announcement {
  id: string;
  title: string;
  content: string;
  classLevelId: string;
  sectionId: string;
  isPinned: boolean;
  expiresAt?: string;
  attachments?: any[];
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
}

interface Class {
  id: string;
  classLevel: {
    id: string;
    name: string;
  };
  section: {
    id: string;
    name: string;
  };
}

export default function AnnouncementsPage() {
  const searchParams = useSearchParams();
  const classIdFromUrl = searchParams.get('classId');
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(classIdFromUrl || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchAnnouncements();
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/teacher/classes');
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }
      
      const data = await response.json();
      setClasses(data.classes || []);
      
      // If no class selected but we have classes, select the first one
      if (!selectedClassId && data.classes && data.classes.length > 0) {
        setSelectedClassId(data.classes[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    if (!selectedClassId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/teacher/announcements?classId=${selectedClassId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch announcements');
      }
      
      const data = await response.json();
      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingAnnouncement(null);
    setShowEditor(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowEditor(true);
  };

  const handlePin = async (announcementId: string, isPinned: boolean) => {
    try {
      const response = await fetch('/api/teacher/announcements', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: announcementId,
          isPinned: !isPinned 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update announcement');
      }
      
      await fetchAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update announcement');
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const response = await fetch(`/api/teacher/announcements?id=${announcementId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete announcement');
      }
      
      await fetchAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  };

  const handleSave = async (announcementData: {
    title: string;
    content: string;
    classId: string;
    isPinned: boolean;
    expiresAt: string | null;
    attachments: any[];
  }) => {
    try {
      const method = editingAnnouncement ? 'PUT' : 'POST';
      const payload = editingAnnouncement 
        ? { 
            id: editingAnnouncement.id,
            title: announcementData.title,
            content: announcementData.content,
            isPinned: announcementData.isPinned,
            expiresAt: announcementData.expiresAt,
            attachments: announcementData.attachments
          }
        : announcementData;
      
      const response = await fetch('/api/teacher/announcements', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save announcement');
      }
      
      setShowEditor(false);
      await fetchAnnouncements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save announcement');
    }
  };

  const getSelectedClass = () => {
    return classes.find(cls => cls.id === selectedClassId);
  };

  const getClassDisplayName = (classLevelId: string, sectionId: string) => {
    const selectedClass = classes.find(cls => 
      cls.classLevel.id === classLevelId && cls.section.id === sectionId
    );
    return selectedClass 
      ? `${selectedClass.classLevel.name} - ${selectedClass.section.name}`
      : 'Unknown Class';
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (activeTab) {
      case 'pinned':
        return matchesSearch && announcement.isPinned;
      case 'active':
        return matchesSearch && (!announcement.expiresAt || new Date(announcement.expiresAt) > new Date());
      case 'expired':
        return matchesSearch && announcement.expiresAt && new Date(announcement.expiresAt) <= new Date();
      default:
        return matchesSearch;
    }
  });

  const tabs = [
    { id: 'all', label: 'All Announcements', count: announcements.length },
    { id: 'pinned', label: 'Pinned', count: announcements.filter(a => a.isPinned).length },
    { id: 'active', label: 'Active', count: announcements.filter(a => !a.expiresAt || new Date(a.expiresAt) > new Date()).length },
    { id: 'expired', label: 'Expired', count: announcements.filter(a => a.expiresAt && new Date(a.expiresAt) <= new Date()).length },
  ];

  if (loading && classes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedClassId && classes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Classes Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need to be assigned to classes before you can manage announcements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Class Announcements
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create and manage announcements for your classes
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.classLevel.name} - {cls.section.name}
              </option>
            ))}
          </select>
          <Button onClick={handleCreateNew} disabled={!selectedClassId}>
            Create Announcement
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedClassId && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-6">
            {/* Search Bar */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue={activeTab}>
              <TabsList className="mb-6">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                  >
                    {tab.label}
                    <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                      {tab.count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id}>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p>Loading announcements...</p>
                      </div>
                    ) : filteredAnnouncements.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">📢</div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          No announcements found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {activeTab === 'all' 
                            ? 'Create your first announcement to get started.'
                            : `No ${tab.label.toLowerCase()} announcements found.`
                          }
                        </p>
                      </div>
                    ) : (
                      filteredAnnouncements.map((announcement) => (
                        <div
                          key={announcement.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                  {announcement.title}
                                </h3>
                                {announcement.isPinned && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-xs font-medium">
                                    📌 Pinned
                                  </span>
                                )}
                                {announcement.expiresAt && new Date(announcement.expiresAt) <= new Date() && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-xs font-medium">
                                    Expired
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
                                {announcement.content}
                              </p>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                <span>Class: {getClassDisplayName(announcement.classLevelId, announcement.sectionId)}</span>
                                <span>•</span>
                                <span>Created: {new Date(announcement.createdAt).toLocaleDateString()}</span>
                                {announcement.expiresAt && (
                                  <>
                                    <span>•</span>
                                    <span>Expires: {new Date(announcement.expiresAt).toLocaleDateString()}</span>
                                  </>
                                )}
                                {announcement.attachments && announcement.attachments.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>📎 {announcement.attachments.length} attachment(s)</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePin(announcement.id, announcement.isPinned)}
                              >
                                {announcement.isPinned ? 'Unpin' : 'Pin'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(announcement)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(announcement.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      )}

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
            </DialogTitle>
          </DialogHeader>
          <AnnouncementEditor
            announcement={editingAnnouncement ? {
              title: editingAnnouncement.title,
              content: editingAnnouncement.content,
              classId: `${editingAnnouncement.classLevelId}-${editingAnnouncement.sectionId}`,
              isPinned: editingAnnouncement.isPinned,
              expiresAt: editingAnnouncement.expiresAt,
              attachments: editingAnnouncement.attachments || []
            } : null}
            classId={selectedClassId}
            onSave={handleSave}
            onCancel={() => setShowEditor(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
