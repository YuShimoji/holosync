// Deterministic local ranking; no account data leaves this device.
export function rankFeed(entries, profile, now = Date.now()) {
  const seen = new Set();
  const lower = (value) => String(value || '').toLocaleLowerCase();
  const include = (profile.includeKeywords || []).map(lower).filter(Boolean);
  const exclude = (profile.excludeKeywords || []).map(lower).filter(Boolean);
  const blocked = new Set(profile.excludeChannels || []);
  const weight = Math.max(0, Math.min(1, Number(profile.freshness ?? 40) / 100));
  return entries
    .filter((entry) => {
      if (seen.has(entry.videoId)) {
        return false;
      }
      seen.add(entry.videoId);
      const text = lower(`${entry.title} ${entry.description}`);
      return !blocked.has(entry.channelId) && !exclude.some((word) => text.includes(word));
    })
    .map((entry) => {
      const title = lower(entry.title);
      const desc = lower(entry.description);
      const matched = include.filter((word) => title.includes(word) || desc.includes(word));
      const keyword = matched.reduce((sum, word) => sum + (title.includes(word) ? 2 : 1), 0);
      const channelWeight = Math.max(
        0,
        Math.min(5, Number(profile.channelWeights?.[entry.channelId] ?? 1) || 0)
      );
      const watched = Math.min(5, Number(profile.history?.[entry.channelId] || 0));
      const hours = Math.max(0, (now - new Date(entry.published).getTime()) / 3600000);
      const fresh = Number.isFinite(hours) ? Math.exp(-hours / 72) : 0;
      const score = fresh * weight * 10 + (keyword * 2 + channelWeight + watched) * (1 - weight);
      const reasons = [
        matched.length ? 'キーワード一致' : '',
        channelWeight > 1 ? 'チャンネル優先' : '',
        watched ? '視聴履歴' : '',
        fresh > 0.75 ? '新着' : '',
      ].filter(Boolean);
      return { ...entry, score, reasons };
    })
    .sort((a, b) => b.score - a.score || a.videoId.localeCompare(b.videoId));
}
