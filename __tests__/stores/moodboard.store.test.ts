/**
 * Tests for Moodboard Zustand store — board CRUD, voting, clipping.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useMoodboardStore } from '@/lib/stores/moodboard.store';

beforeEach(() => {
  useMoodboardStore.setState({
    boards: [],
    activeBoardId: null,
    voteMode: false,
    voteIndex: 0,
    voteResults: [],
    clipQueue: [],
    autoClipEnabled: true,
  });
});

describe('MoodboardStore', () => {
  describe('Board CRUD', () => {
    it('should add a board', () => {
      const { addBoard } = useMoodboardStore.getState();
      const board = addBoard('Design Inspo');
      const { boards, activeBoardId } = useMoodboardStore.getState();
      expect(boards).toHaveLength(1);
      expect(boards[0]!.name).toBe('Design Inspo');
      expect(boards[0]!.nodes).toEqual([]);
      expect(activeBoardId).toBe(board.id);
    });

    it('should delete a board', () => {
      const { addBoard, deleteBoard } = useMoodboardStore.getState();
      const b1 = addBoard('Board 1');
      addBoard('Board 2');
      deleteBoard(b1.id);
      expect(useMoodboardStore.getState().boards).toHaveLength(1);
      expect(useMoodboardStore.getState().boards[0]!.name).toBe('Board 2');
    });

    it('should clear activeBoardId when deleting active board', () => {
      const { addBoard, deleteBoard } = useMoodboardStore.getState();
      const b1 = addBoard('Board 1');
      deleteBoard(b1.id);
      expect(useMoodboardStore.getState().activeBoardId).toBeNull();
    });

    it('should update a board', () => {
      const { addBoard, updateBoard } = useMoodboardStore.getState();
      const b = addBoard('Old Name');
      updateBoard(b.id, { name: 'New Name' });
      expect(useMoodboardStore.getState().boards[0]!.name).toBe('New Name');
    });

    it('should set active board', () => {
      const { addBoard, setActiveBoardId } = useMoodboardStore.getState();
      const b1 = addBoard('Board 1');
      const b2 = addBoard('Board 2');
      setActiveBoardId(b2.id);
      expect(useMoodboardStore.getState().activeBoardId).toBe(b2.id);
    });
  });

  describe('Voting', () => {
    it('should start and stop vote mode', () => {
      const { startVote, stopVote } = useMoodboardStore.getState();
      startVote();
      expect(useMoodboardStore.getState().voteMode).toBe(true);
      expect(useMoodboardStore.getState().voteIndex).toBe(0);
      stopVote();
      expect(useMoodboardStore.getState().voteMode).toBe(false);
    });

    it('should record a vote', () => {
      const { startVote, recordVote } = useMoodboardStore.getState();
      startVote();
      recordVote('node-1', true);
      const { voteResults } = useMoodboardStore.getState();
      expect(voteResults).toHaveLength(1);
      expect(voteResults[0]!.nodeId).toBe('node-1');
      expect(voteResults[0]!.approved).toBe(true);
    });

    it('should record reject vote', () => {
      const { startVote, recordVote } = useMoodboardStore.getState();
      startVote();
      recordVote('node-1', false);
      expect(useMoodboardStore.getState().voteResults[0]!.approved).toBe(false);
    });

    it('should advance vote index', () => {
      const { startVote, advanceVote } = useMoodboardStore.getState();
      startVote();
      advanceVote();
      expect(useMoodboardStore.getState().voteIndex).toBe(1);
    });

    it('should get approved nodes', () => {
      const { startVote, recordVote, getApprovedNodes } = useMoodboardStore.getState();
      startVote();
      recordVote('node-1', true);
      recordVote('node-2', false);
      recordVote('node-3', true);
      expect(getApprovedNodes()).toEqual(['node-1', 'node-3']);
    });
  });

  describe('Clipping', () => {
    it('should add a clip', () => {
      const { addClip } = useMoodboardStore.getState();
      addClip({ url: 'https://example.com', title: 'Example', source: 'browser' });
      // autoClipEnabled is true so it auto-processes
      const { clipQueue } = useMoodboardStore.getState();
      // Clip is auto-processed because autoClipEnabled defaults to true
      // The clip is dequeued by processClipQueue
    });

    it('should queue clip when autoClip disabled', () => {
      const { addClip, setAutoClip } = useMoodboardStore.getState();
      setAutoClip(false);
      addClip({ url: 'https://example.com', title: 'Example' });
      expect(useMoodboardStore.getState().clipQueue).toHaveLength(1);
      expect(useMoodboardStore.getState().clipQueue[0]!.url).toBe('https://example.com');
    });

    it('should process clip queue', () => {
      const { addClip, setAutoClip, processClipQueue } = useMoodboardStore.getState();
      setAutoClip(false);
      addClip({ url: 'https://a.com', title: 'A' });
      addClip({ url: 'https://b.com', title: 'B' });
      const first = processClipQueue();
      expect(first?.url).toBe('https://a.com');
      expect(useMoodboardStore.getState().clipQueue).toHaveLength(1);
    });

    it('should return null when queue empty', () => {
      const { processClipQueue } = useMoodboardStore.getState();
      expect(processClipQueue()).toBeNull();
    });

    it('should toggle auto clip', () => {
      const { setAutoClip } = useMoodboardStore.getState();
      expect(useMoodboardStore.getState().autoClipEnabled).toBe(true);
      setAutoClip(false);
      expect(useMoodboardStore.getState().autoClipEnabled).toBe(false);
    });
  });

  describe('Campaign linking', () => {
    it('should link board to campaign', () => {
      const { addBoard, linkBoardToCampaign } = useMoodboardStore.getState();
      const b = addBoard('Test');
      linkBoardToCampaign(b.id, 'campaign-1');
      expect(useMoodboardStore.getState().boards[0]!.campaignId).toBe('campaign-1');
    });

    it('should unlink board from campaign', () => {
      const { addBoard, linkBoardToCampaign, unlinkBoardFromCampaign } = useMoodboardStore.getState();
      const b = addBoard('Test');
      linkBoardToCampaign(b.id, 'campaign-1');
      unlinkBoardFromCampaign(b.id);
      expect(useMoodboardStore.getState().boards[0]!.campaignId).toBeUndefined();
    });

    it('should get boards for campaign', () => {
      const { addBoard, linkBoardToCampaign, getBoardsForCampaign } = useMoodboardStore.getState();
      const b1 = addBoard('Board 1');
      const b2 = addBoard('Board 2');
      linkBoardToCampaign(b1.id, 'campaign-1');
      linkBoardToCampaign(b2.id, 'campaign-1');
      expect(getBoardsForCampaign('campaign-1')).toHaveLength(2);
      expect(getBoardsForCampaign('campaign-2')).toHaveLength(0);
    });
  });

  describe('getCurrentBoard', () => {
    it('should return current board', () => {
      const { addBoard, getCurrentBoard } = useMoodboardStore.getState();
      addBoard('Test');
      const board = getCurrentBoard();
      expect(board?.name).toBe('Test');
    });

    it('should return undefined when no board active', () => {
      const { getCurrentBoard } = useMoodboardStore.getState();
      expect(getCurrentBoard()).toBeUndefined();
    });
  });
});
