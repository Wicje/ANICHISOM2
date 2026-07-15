/**
 * ANICHISOM OS: Side-Gigs Marketplace
 * 
 * Freelance opportunity platform for the creative agency
 * Phase 3C: Side-Gigs
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOS } from '@/lib/os-context';
import {
  Briefcase, Plus, Search, Filter, Clock, DollarSign, Users, Star,
  MapPin, CheckCircle, AlertCircle, Heart, Share2, MessageSquare,
  TrendingUp, Award, User, Calendar, Send, X
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { cn } from '@/lib/utils';

interface SideGig {
  id: string;
  title: string;
  description: string;
  budget: { min: number; max: number; currency: string };
  skills: string[];
  timeline: { start: Date; end: Date };
  status: 'open' | 'in-progress' | 'completed';
  postedBy: { id: string; name: string; avatar?: string };
  applicants: number;
  rating: number;
  location: string;
  remote: boolean;
  createdAt: Date;
  proposals?: Array<{ id: string; userId: string; amount: number; message: string }>;
}

interface UserApplication {
  gigId: string;
  proposedBudget: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export function SideGigsMarketplace() {
  const { currentUser, workspaceId, emitEvent } = useOS();
  const [gigs, setGigs] = useState<SideGig[]>(() => [
    {
      id: 'gig-1',
      title: 'Brand Identity Design for Tech Startup',
      description: 'Complete brand identity including logo, color palette, typography, and guidelines.',
      budget: { min: 8000, max: 15000, currency: 'USD' },
      skills: ['logo design', 'branding', 'typography', 'figma'],
      timeline: { start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      status: 'open',
      postedBy: { id: 'user-1', name: 'TechVentures Inc', avatar: '🏢' },
      applicants: 23,
      rating: 4.8,
      location: 'Remote',
      remote: true,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'gig-2',
      title: 'E-commerce Website Redesign',
      description: 'Modernize existing e-commerce platform with improved UX and conversion optimization.',
      budget: { min: 12000, max: 25000, currency: 'USD' },
      skills: ['ux design', 'web design', 'conversion optimization', 'figma'],
      timeline: { start: new Date(), end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
      status: 'open',
      postedBy: { id: 'user-2', name: 'ShopHub', avatar: '🛍️' },
      applicants: 17,
      rating: 4.9,
      location: 'Remote',
      remote: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'gig-3',
      title: 'Motion Graphics for Product Demo',
      description: 'Create engaging motion graphics video for SaaS product demonstration.',
      budget: { min: 3000, max: 8000, currency: 'USD' },
      skills: ['motion graphics', 'after effects', 'video editing'],
      timeline: { start: new Date(), end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) },
      status: 'open',
      postedBy: { id: 'user-3', name: 'CloudTools', avatar: '☁️' },
      applicants: 12,
      rating: 4.7,
      location: 'Remote',
      remote: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  ]);
  const [selectedGig, setSelectedGig] = useState<SideGig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [filterBudget, setFilterBudget] = useState({ min: 0, max: 50000 });
  const [showNewGigForm, setShowNewGigForm] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [applications, setApplications] = useState<UserApplication[]>([]);
  const [newGigData, setNewGigData] = useState({
    title: '',
    description: '',
    minBudget: 5000,
    maxBudget: 15000,
    skills: '',
    timeline: 7,
  });
  const [proposalData, setProposalData] = useState({ budget: 5000, message: '' });
  const [savedGigs, setSavedGigs] = useState<string[]>([]);

  // Filter gigs (derived purely using useMemo)
  const filteredGigs = useMemo(() => {
    let filtered = gigs;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.title.toLowerCase().includes(query) ||
          g.description.toLowerCase().includes(query) ||
          g.skills.some((s) => s.toLowerCase().includes(query))
      );
    }

    // Skills filter
    if (filterSkills.length > 0) {
      filtered = filtered.filter((g) =>
        filterSkills.some((skill) => g.skills.includes(skill))
      );
    }

    // Budget filter
    filtered = filtered.filter(
      (g) =>
        g.budget.min >= filterBudget.min &&
        g.budget.max <= filterBudget.max
    );

    return filtered;
  }, [searchQuery, filterSkills, filterBudget, gigs]);

  const handleCreateGig = () => {
    if (!newGigData.title.trim()) return;

    const newGig: SideGig = {
      id: crypto.randomUUID(),
      title: newGigData.title,
      description: newGigData.description,
      budget: {
        min: newGigData.minBudget,
        max: newGigData.maxBudget,
        currency: 'USD',
      },
      skills: newGigData.skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s),
      timeline: {
        start: new Date(),
        end: new Date(Date.now() + newGigData.timeline * 24 * 60 * 60 * 1000),
      },
      status: 'open',
      postedBy: {
        id: currentUser?.id || '',
        name: currentUser?.name || 'Anonymous',
        avatar: currentUser?.avatarUrl,
      },
      applicants: 0,
      rating: 5,
      location: 'Remote',
      remote: true,
      createdAt: new Date(),
    };

    setGigs([newGig, ...gigs]);
    setNewGigData({
      title: '',
      description: '',
      minBudget: 5000,
      maxBudget: 15000,
      skills: '',
      timeline: 7,
    });
    setShowNewGigForm(false);

    emitEvent({
      type: 'gig_posted',
      workspaceId,
      entityId: newGig.id,
      userId: currentUser?.id || 'unknown',
      comment: `Posted new gig: ${newGig.title}`,
    });
  };

  const handleSubmitProposal = () => {
    if (!selectedGig || !proposalData.message.trim()) return;

    const application: UserApplication = {
      gigId: selectedGig.id,
      proposedBudget: proposalData.budget,
      message: proposalData.message,
      status: 'pending',
    };

    setApplications([...applications, application]);
    setProposalData({ budget: selectedGig.budget.min, message: '' });
    setShowProposalForm(false);

    emitEvent({
      type: 'proposal_submitted',
      workspaceId,
      entityId: selectedGig.id,
      userId: currentUser?.id || 'unknown',
      newValue: proposalData.budget,
      comment: `Submitted proposal for: ${selectedGig.title}`,
    });
  };

  const userApplication = selectedGig
    ? applications.find((a) => a.gigId === selectedGig.id)
    : null;

  const allSkills = Array.from(new Set(gigs.flatMap((g) => g.skills)));

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 shrink-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6" />
            Side Gigs Marketplace
          </h1>
          <button
            onClick={() => setShowNewGigForm(!showNewGigForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post a Gig
          </button>
        </div>
        <p className="text-sm text-gray-400">
          Find freelance opportunities and connect with talented creatives
        </p>
      </div>

      {/* New Gig Form */}
      {showNewGigForm && (
        <div className="border-b border-gray-700 p-4 bg-gray-800/50">
          <div className="space-y-3 max-w-2xl">
            <input
              placeholder="Gig title"
              value={newGigData.title}
              onChange={(e) => setNewGigData({ ...newGigData, title: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
            />
            <textarea
              placeholder="Description"
              value={newGigData.description}
              onChange={(e) => setNewGigData({ ...newGigData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 min-h-24"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Min budget"
                value={newGigData.minBudget}
                onChange={(e) => setNewGigData({ ...newGigData, minBudget: parseInt(e.target.value) })}
                className="px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
              />
              <input
                type="number"
                placeholder="Max budget"
                value={newGigData.maxBudget}
                onChange={(e) => setNewGigData({ ...newGigData, maxBudget: parseInt(e.target.value) })}
                className="px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
              />
              <input
                type="number"
                placeholder="Days"
                value={newGigData.timeline}
                onChange={(e) => setNewGigData({ ...newGigData, timeline: parseInt(e.target.value) })}
                className="px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
              />
            </div>
            <input
              placeholder="Skills (comma separated)"
              value={newGigData.skills}
              onChange={(e) => setNewGigData({ ...newGigData, skills: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateGig}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
              >
                Post Gig
              </button>
              <button
                onClick={() => setShowNewGigForm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Sidebar: Filters */}
        <div className="w-64 border border-gray-700 rounded bg-gray-800/30 overflow-y-auto shrink-0 p-4">
          <h3 className="font-semibold text-sm mb-3">Filters</h3>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <input
                placeholder="Search gigs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-700 rounded text-sm text-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Budget</label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={filterBudget.min}
                onChange={(e) =>
                  setFilterBudget({ ...filterBudget, min: parseInt(e.target.value) })
                }
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={filterBudget.max}
                onChange={(e) =>
                  setFilterBudget({ ...filterBudget, max: parseInt(e.target.value) })
                }
                className="w-full"
              />
              <div className="text-xs text-gray-400">
                ${filterBudget.min.toLocaleString()} - ${filterBudget.max.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-2 block">Skills</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {allSkills.map((skill) => (
                <label key={skill} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterSkills.includes(skill)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilterSkills([...filterSkills, skill]);
                      } else {
                        setFilterSkills(filterSkills.filter((s) => s !== skill));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  {skill}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Gigs List */}
        <div className="flex-1 border border-gray-700 rounded bg-gray-800/30 overflow-y-auto">
          {filteredGigs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No gigs found</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredGigs.map((gig) => (
                <button
                  key={gig.id}
                  onClick={() => {
                    setSelectedGig(gig);
                    setShowProposalForm(false);
                  }}
                  className={`w-full text-left p-4 transition-colors hover:bg-gray-700/50 ${
                    selectedGig?.id === gig.id ? 'bg-blue-600/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{gig.title}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (savedGigs.includes(gig.id)) {
                          setSavedGigs(savedGigs.filter((id) => id !== gig.id));
                        } else {
                          setSavedGigs([...savedGigs, gig.id]);
                        }
                      }}
                      className={cn(
                        'p-1 transition-colors',
                        savedGigs.includes(gig.id)
                          ? 'text-red-400'
                          : 'text-gray-400 hover:text-red-400'
                      )}
                    >
                      <Heart
                        className={cn('w-5 h-5', savedGigs.includes(gig.id) && 'fill-current')}
                      />
                    </button>
                  </div>

                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{gig.description}</p>

                  <div className="flex flex-wrap gap-3 mb-3 text-sm">
                    <div className="flex items-center gap-1 text-green-400">
                      <DollarSign className="w-4 h-4" />
                      ${gig.budget.min.toLocaleString()} - ${gig.budget.max.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 text-blue-400">
                      <Clock className="w-4 h-4" />
                      {formatDistance(gig.timeline.end, new Date())}
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-4 h-4" />
                      {gig.rating}
                    </div>
                    <div className="flex items-center gap-1 text-purple-400">
                      <Users className="w-4 h-4" />
                      {gig.applicants} applicants
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="flex gap-1 flex-wrap">
                    {gig.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {skill}
                      </span>
                    ))}
                    {gig.skills.length > 3 && (
                      <span className="text-xs text-gray-400">+{gig.skills.length - 3}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Gig Details */}
        {selectedGig && (
          <div className="w-96 border border-gray-700 rounded bg-gray-800/30 overflow-y-auto flex flex-col shrink-0">
            <div className="p-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-semibold mb-2">{selectedGig.title}</h2>
              <p className="text-sm text-gray-400 mb-3">{selectedGig.description}</p>

              {!userApplication && (
                <button
                  onClick={() => setShowProposalForm(!showProposalForm)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Send Proposal
                </button>
              )}

              {userApplication && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700/50 rounded text-sm text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  Proposal {userApplication.status}
                </div>
              )}
            </div>

            {/* Proposal Form */}
            {showProposalForm && !userApplication && (
              <div className="p-4 border-b border-gray-700 bg-gray-700/30 space-y-2">
                <input
                  type="number"
                  placeholder="Your bid"
                  value={proposalData.budget}
                  onChange={(e) => setProposalData({ ...proposalData, budget: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 rounded text-white text-sm"
                />
                <textarea
                  placeholder="Your message"
                  value={proposalData.message}
                  onChange={(e) => setProposalData({ ...proposalData, message: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 rounded text-white text-sm h-20"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitProposal}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => setShowProposalForm(false)}
                    className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1 block">Budget</label>
                <div className="text-lg font-semibold text-green-400">
                  ${selectedGig.budget.min.toLocaleString()} - ${selectedGig.budget.max.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 mb-1 block">Timeline</label>
                <div className="text-sm">
                  {format(selectedGig.timeline.start, 'MMM d')} - {format(selectedGig.timeline.end, 'MMM d, yyyy')}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Skills Needed</label>
                <div className="flex flex-wrap gap-1">
                  {selectedGig.skills.map((skill) => (
                    <span key={skill} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Posted by</label>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    {selectedGig.postedBy.avatar || '👤'}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{selectedGig.postedBy.name}</div>
                    <div className="text-xs text-gray-400">
                      {formatDistance(selectedGig.createdAt, new Date(), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SideGigsMarketplace;
