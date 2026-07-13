import { describe, it, expect, beforeEach } from 'vitest';
import { useCampaignStore } from '@/lib/stores/campaign.store';

describe('Campaign Store', () => {
  beforeEach(() => {
    useCampaignStore.setState({
      pages: [],
      databaseStore: {},
      linkedDatabases: [],
      campaignShares: [],
      notifications: [],
      activePageId: null,
      sidebarOpen: true,
      shareModalOpen: false,
      coverPickerOpen: false,
    });
  });

  describe('Page CRUD', () => {
    it('adds a campaign-level page', () => {
      const { addPage, pages } = useCampaignStore.getState();
      const page = addPage(null, 'campaign');
      const updated = useCampaignStore.getState().pages;
      expect(updated).toHaveLength(1);
      expect(updated[0]!.level).toBe('campaign');
      expect(updated[0]!.parentId).toBeNull();
      expect(updated[0]!.id).toBe(page.id);
    });

    it('adds a child page under campaign', () => {
      const { addPage } = useCampaignStore.getState();
      const campaign = addPage(null, 'campaign');
      const phase = addPage(campaign.id, 'phase');
      const updated = useCampaignStore.getState().pages;
      expect(updated).toHaveLength(2);
      expect(updated[1]!.parentId).toBe(campaign.id);
      expect(updated[1]!.level).toBe('phase');
      expect(updated[1]!.campaignId).toBe(campaign.id);
    });

    it('derives level from parent when not specified', () => {
      const { addPage } = useCampaignStore.getState();
      const campaign = addPage(null, 'campaign');
      const phase = addPage(campaign.id); // no level specified
      const task = addPage(phase.id);     // no level specified
      const updated = useCampaignStore.getState().pages;
      expect(updated[1]!.level).toBe('phase');
      expect(updated[2]!.level).toBe('task');
    });

    it('sets default status for task-level pages', () => {
      const { addPage } = useCampaignStore.getState();
      const campaign = addPage(null, 'campaign');
      const task = addPage(campaign.id, 'task');
      const updated = useCampaignStore.getState().pages;
      expect(updated[1]!.status).toBe('todo');
    });

    it('updates a page', () => {
      const { addPage } = useCampaignStore.getState();
      const page = addPage(null, 'campaign');
      useCampaignStore.getState().updatePage(page.id, { title: 'My Campaign', icon: '🚀' });
      const updated = useCampaignStore.getState().pages;
      expect(updated[0]!.title).toBe('My Campaign');
      expect(updated[0]!.icon).toBe('🚀');
    });

    it('soft-deletes a page and its children', () => {
      const { addPage } = useCampaignStore.getState();
      const campaign = addPage(null, 'campaign');
      const phase = addPage(campaign.id, 'phase');
      const task = addPage(phase.id, 'task');

      useCampaignStore.getState().deletePage(campaign.id);
      const updated = useCampaignStore.getState().pages;
      expect(updated.every(p => p.trash)).toBe(true);
    });

    it('restores a trashed page', () => {
      const { addPage } = useCampaignStore.getState();
      const page = addPage(null, 'campaign');
      useCampaignStore.getState().deletePage(page.id);
      expect(useCampaignStore.getState().pages[0]!.trash).toBe(true);

      useCampaignStore.getState().restorePage(page.id);
      expect(useCampaignStore.getState().pages[0]!.trash).toBe(false);
    });
  });

  describe('Hierarchy', () => {
    it('getChildren returns children sorted by sortOrder', () => {
      const { addPage } = useCampaignStore.getState();
      const campaign = addPage(null, 'campaign');
      const phase1 = addPage(campaign.id, 'phase');
      const phase2 = addPage(campaign.id, 'phase');
      useCampaignStore.getState().updatePage(phase2.id, { sortOrder: 0 });
      useCampaignStore.getState().updatePage(phase1.id, { sortOrder: 1 });

      const children = useCampaignStore.getState().getChildren(campaign.id);
      expect(children[0]!.id).toBe(phase2.id);
      expect(children[1]!.id).toBe(phase1.id);
    });

    it('getBreadcrumbs builds correct trail', () => {
      const { addPage } = useCampaignStore.getState();
      const campaign = addPage(null, 'campaign');
      const phase = addPage(campaign.id, 'phase');
      const task = addPage(phase.id, 'task');

      const breadcrumbs = useCampaignStore.getState().getBreadcrumbs(task.id);
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]!.level).toBe('campaign');
      expect(breadcrumbs[1]!.level).toBe('phase');
      expect(breadcrumbs[2]!.level).toBe('task');
    });

    it('movePage reparents and updates level', () => {
      const { addPage } = useCampaignStore.getState();
      const c1 = addPage(null, 'campaign');
      const c2 = addPage(null, 'campaign');
      const phase = addPage(c1.id, 'phase');

      useCampaignStore.getState().movePage(phase.id, c2.id);
      const updated = useCampaignStore.getState().pages.find(p => p.id === phase.id)!;
      expect(updated.parentId).toBe(c2.id);
      expect(updated.campaignId).toBe(c2.id);
    });

    it('getPageLevel returns correct level', () => {
      const { addPage } = useCampaignStore.getState();
      const campaign = addPage(null, 'campaign');
      expect(useCampaignStore.getState().getPageLevel(campaign.id)).toBe('campaign');
    });
  });

  describe('Database', () => {
    it('updates a database schema', () => {
      useCampaignStore.getState().updateDatabase('db-test', {
        id: 'db-test',
        name: 'Test DB',
        icon: '🧪',
        properties: [],
        rows: [],
      });
      expect(useCampaignStore.getState().databaseStore['db-test']?.name).toBe('Test DB');
    });

    it('adds a new database', () => {
      useCampaignStore.getState().addDatabase({
        id: 'db-new',
        name: 'New DB',
        icon: '📦',
        properties: [],
        rows: [],
      });
      expect(useCampaignStore.getState().databaseStore['db-new']).toBeDefined();
    });

    it('links databases across campaigns', () => {
      const link = useCampaignStore.getState().linkDatabase('db-source', 'campaign-2', 'Test Link');
      expect(useCampaignStore.getState().linkedDatabases).toHaveLength(1);
      expect(link.sourceDbId).toBe('db-source');
      expect(link.targetCampaignId).toBe('campaign-2');

      useCampaignStore.getState().unlinkDatabase(link.id);
      expect(useCampaignStore.getState().linkedDatabases).toHaveLength(0);
    });

    it('getLinkedDatabases filters by campaign', () => {
      useCampaignStore.getState().linkDatabase('db-1', 'campaign-a');
      useCampaignStore.getState().linkDatabase('db-2', 'campaign-b');
      useCampaignStore.getState().linkDatabase('db-3', 'campaign-a');

      const links = useCampaignStore.getState().getLinkedDatabases('campaign-a');
      expect(links).toHaveLength(2);
    });
  });

  describe('Campaign Sharing', () => {
    it('creates a share link', () => {
      const share = useCampaignStore.getState().createShareLink('campaign-1', 'Client: Nike', 'Nike');
      expect(share.campaignId).toBe('campaign-1');
      expect(share.permission).toBe('viewer');
      expect(share.label).toBe('Client: Nike');
      expect(share.token).toBeDefined();
    });

    it('gets shares for a campaign', () => {
      useCampaignStore.getState().createShareLink('campaign-1', 'Link 1');
      useCampaignStore.getState().createShareLink('campaign-1', 'Link 2');
      useCampaignStore.getState().createShareLink('campaign-2', 'Link 3');

      const shares = useCampaignStore.getState().getCampaignShares('campaign-1');
      expect(shares).toHaveLength(2);
    });

    it('revokes a share link', () => {
      const share = useCampaignStore.getState().createShareLink('campaign-1');
      useCampaignStore.getState().revokeShareLink(share.id);
      expect(useCampaignStore.getState().getCampaignShares('campaign-1')).toHaveLength(0);
    });
  });

  describe('Notifications', () => {
    it('adds a notification', () => {
      useCampaignStore.getState().addNotification(
        'mention', 'user-1', 'user-2', 'Alice', 'page-1', 'Alice mentioned you'
      );
      const notifs = useCampaignStore.getState().getUserNotifications('user-1');
      expect(notifs).toHaveLength(1);
      expect(notifs[0]!.type).toBe('mention');
      expect(notifs[0]!.read).toBe(false);
    });

    it('marks notification as read', () => {
      useCampaignStore.getState().addNotification(
        'mention', 'user-1', 'user-2', 'Alice', 'page-1', 'msg'
      );
      const notifId = useCampaignStore.getState().notifications[0]!.id;
      useCampaignStore.getState().markNotificationRead(notifId);
      expect(useCampaignStore.getState().notifications[0]!.read).toBe(true);
    });

    it('marks all notifications as read for a user', () => {
      useCampaignStore.getState().addNotification('mention', 'user-1', 'u', 'A', 'p', 'm1');
      useCampaignStore.getState().addNotification('comment', 'user-1', 'u', 'B', 'p', 'm2');
      useCampaignStore.getState().addNotification('mention', 'user-2', 'u', 'C', 'p', 'm3');

      useCampaignStore.getState().markAllNotificationsRead('user-1');
      const user1Notifs = useCampaignStore.getState().getUserNotifications('user-1');
      expect(user1Notifs.every(n => n.read)).toBe(true);

      const user2Notifs = useCampaignStore.getState().getUserNotifications('user-2');
      expect(user2Notifs[0]!.read).toBe(false);
    });

    it('getUnreadCount returns correct count', () => {
      useCampaignStore.getState().addNotification('mention', 'user-1', 'u', 'A', 'p', 'm1');
      useCampaignStore.getState().addNotification('comment', 'user-1', 'u', 'B', 'p', 'm2');
      expect(useCampaignStore.getState().getUnreadCount('user-1')).toBe(2);

      const notifId = useCampaignStore.getState().notifications[0]!.id;
      useCampaignStore.getState().markNotificationRead(notifId);
      expect(useCampaignStore.getState().getUnreadCount('user-1')).toBe(1);
    });
  });

  describe('Comments with @mentions', () => {
    it('adds comment and sends notifications to mentioned users', () => {
      const { addPage } = useCampaignStore.getState();
      const page = addPage(null, 'campaign');
      const block = page.blocks[0]!;

      const comment = {
        id: 'comment-1',
        userId: 'user-1',
        userName: 'Alice',
        text: 'Hey @Bob, check this out',
        createdAt: Date.now(),
        resolved: false,
      };

      useCampaignStore.getState().addCommentWithMentions(
        page.id, block.id, comment, ['user-2']
      );

      // Verify comment was added to block
      const updatedPage = useCampaignStore.getState().pages.find(p => p.id === page.id);
      const updatedBlock = updatedPage?.blocks.find(b => b.id === block.id)!;
      expect(updatedBlock.comments).toHaveLength(1);
      expect(updatedBlock.comments?.[0]!.mentionedUserIds).toEqual(['user-2']);

      // Verify notification was sent
      const notifs = useCampaignStore.getState().getUserNotifications('user-2');
      expect(notifs).toHaveLength(1);
      expect(notifs[0]!.type).toBe('mention');
      expect(notifs[0]!.message).toContain('Alice');
    });
  });

  describe('UI State', () => {
    it('toggles sidebar', () => {
      expect(useCampaignStore.getState().sidebarOpen).toBe(true);
      useCampaignStore.getState().setSidebarOpen(false);
      expect(useCampaignStore.getState().sidebarOpen).toBe(false);
    });

    it('sets active page', () => {
      useCampaignStore.getState().setActivePageId('page-1');
      expect(useCampaignStore.getState().activePageId).toBe('page-1');
    });

    it('toggles share modal', () => {
      useCampaignStore.getState().setShareModalOpen(true);
      expect(useCampaignStore.getState().shareModalOpen).toBe(true);
    });

    it('toggles cover picker', () => {
      useCampaignStore.getState().setCoverPickerOpen(true);
      expect(useCampaignStore.getState().coverPickerOpen).toBe(true);
    });
  });
});
