import { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

const SETTINGS_KEY = 'mark-lee-settings';
const RECENT_FILES_KEY = 'mark-lee-recent-files';
const MAX_RECENT_FILES = 10;

/**
 * Save user settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

/**
 * Load user settings from localStorage
 * Returns default settings if none are saved
 */
export function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to handle new settings that may have been added
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
    return DEFAULT_SETTINGS;
}

/**
 * Recent files management
 */
export interface RecentFile {
    path: string;
    name: string;
    lastOpened: number; // timestamp
}

export function getRecentFiles(): RecentFile[] {
    try {
        const stored = localStorage.getItem(RECENT_FILES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to load recent files:', error);
    }
    return [];
}

export function addRecentFile(path: string, name: string): void {
    try {
        const recent = getRecentFiles();

        // Remove if already exists
        const filtered = recent.filter(f => f.path !== path);

        // Add to beginning
        filtered.unshift({
            path,
            name,
            lastOpened: Date.now()
        });

        // Keep only last MAX_RECENT_FILES
        const trimmed = filtered.slice(0, MAX_RECENT_FILES);

        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Failed to add recent file:', error);
    }
}

export function clearRecentFiles(): void {
    try {
        localStorage.removeItem(RECENT_FILES_KEY);
    } catch (error) {
        console.error('Failed to clear recent files:', error);
    }
}
