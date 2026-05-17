import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';

import { AppShell } from '@/renderer/ui/layout/AppShell';
import { BookmarksPage } from '@/renderer/ui/pages/BookmarksPage';
import { DownloadsPage } from '@/renderer/ui/pages/DownloadsPage';
import { HomePage } from '@/renderer/ui/pages/HomePage';
import { RepoDetailPage } from '@/renderer/ui/pages/RepoDetailPage';
import { ReposPage } from '@/renderer/ui/pages/ReposPage';
import { SettingsPage } from '@/renderer/ui/pages/SettingsPage';
import { TerminalPage } from '@/renderer/ui/pages/TerminalPage';
import { applyTheme, useConfigStore } from '@/renderer/state/configStore';

export function App() {
  const { config, load } = useConfigStore();

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!config) return;
    applyTheme(config.ui.theme);
  }, [config]);

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />} path="/">
          <Route element={<HomePage />} index />
          <Route element={<DownloadsPage />} path="downloads" />
          <Route element={<TerminalPage />} path="terminal" />
          <Route element={<ReposPage />} path="repos" />
          <Route element={<RepoDetailPage />} path="repos/:repoId" />
          <Route element={<BookmarksPage />} path="bookmarks" />
          <Route element={<SettingsPage />} path="settings" />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Route>
      </Routes>
    </HashRouter>
  );
}
