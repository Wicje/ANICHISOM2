import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '@/lib/stores/theme.store';

describe('ThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({
      wallpaper: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
      themeColor: '#00f0ff',
      fontFamily: 'system-ui, sans-serif',
      screenShader: 'none',
      performanceMode: 'heavy',
    });
  });

  it('starts with default theme', () => {
    const state = useThemeStore.getState();
    expect(state.themeColor).toBe('#00f0ff');
    expect(state.fontFamily).toBe('system-ui, sans-serif');
    expect(state.screenShader).toBe('none');
    expect(state.performanceMode).toBe('heavy');
  });

  it('setThemeColor updates color', () => {
    useThemeStore.getState().setThemeColor('#ff0000');
    expect(useThemeStore.getState().themeColor).toBe('#ff0000');
  });

  it('setWallpaper updates wallpaper', () => {
    useThemeStore.getState().setWallpaper('https://example.com/wall.jpg');
    expect(useThemeStore.getState().wallpaper).toBe('https://example.com/wall.jpg');
  });

  it('setFontFamily updates font', () => {
    useThemeStore.getState().setFontFamily('Georgia, serif');
    expect(useThemeStore.getState().fontFamily).toBe('Georgia, serif');
  });

  it('setScreenShader updates shader', () => {
    useThemeStore.getState().setScreenShader('grayscale');
    expect(useThemeStore.getState().screenShader).toBe('grayscale');
  });

  it('setPerformanceMode toggles mode', () => {
    useThemeStore.getState().setPerformanceMode('light');
    expect(useThemeStore.getState().performanceMode).toBe('light');
    useThemeStore.getState().setPerformanceMode('heavy');
    expect(useThemeStore.getState().performanceMode).toBe('heavy');
  });
});
