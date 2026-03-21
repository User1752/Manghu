// ============================================================================
// CHAPTER INTEGRITY CHECK
// ============================================================================

function checkChapterIntegrity(chapters) {
  if (!chapters || chapters.length === 0) {
    showToast("No Chapters", "No chapters available to check", "info");
    return;
  }

  analyzeChapterIntegrityWithMangaUpdates(chapters, state.currentManga);
}

async function analyzeChapterIntegrityWithMangaUpdates(chapters, mangaDetails = null) {
  const report = analyzeChapterIntegrity(chapters, mangaDetails);
  
  // If no external data, try to fetch from MangaUpdates
  if (!mangaDetails?.lastChapter && state.currentManga?.title) {
    try {
      const response = await api("/api/mangaupdates/search", {
        method: "POST",
        body: JSON.stringify({ title: state.currentManga.title })
      });
      
      if (response.found && response.latestChapter) {
        // Re-analyze with MangaUpdates data
        const enhancedMangaDetails = {
          ...mangaDetails,
          lastChapter: response.latestChapter,
          status: response.status,
          mangaUpdatesUrl: response.url
        };
        const enhancedReport = analyzeChapterIntegrity(chapters, enhancedMangaDetails);
        displayIntegrityReport(enhancedReport, response);
        return;
      }
    } catch (e) {
      dbg.warn(dbg.ERR_MANGAUPD, 'MangaUpdates lookup failed', e);
    }
  }
  
  displayIntegrityReport(report);
}

function analyzeChapterIntegrity(chapters, mangaDetails = null) {
  const issues = [];
  const warnings = [];
  const info = [];

  // Extract chapter numbers (handles numeric strings and "Chapter X" style names)
  const chapterNumbers = chapters
    .map(ch => {
      const direct = parseFloat(ch.chapter);
      if (!isNaN(direct)) return direct;
      // Fallback: extract the first number from strings like "Chapter 1191"
      const match = String(ch.chapter || ch.name || '').match(/\d+(?:\.\d+)?/);
      return match ? parseFloat(match[0]) : NaN;
    })
    .filter(num => !isNaN(num))
    .sort((a, b) => a - b);

  if (chapterNumbers.length === 0) {
    issues.push("No valid chapter numbers found");
    return { issues, warnings, info, stats: {} };
  }

  // Statistics
  const stats = {
    total: chapters.length,
    withNumbers: chapterNumbers.length,
    minChapter: Math.min(...chapterNumbers),
    maxChapter: Math.max(...chapterNumbers),
    range: Math.max(...chapterNumbers) - Math.min(...chapterNumbers) + 1
  };

  // Use external data if available (from manga details)
  const expectedTotalChapters = mangaDetails?.lastChapter 
    ? parseFloat(mangaDetails.lastChapter) 
    : null;

  info.push(`Total chapters available: ${stats.total}`);
  info.push(`Chapter range: ${stats.minChapter} - ${stats.maxChapter}`);
  
  if (expectedTotalChapters) {
    info.push(`Expected total chapters: ${expectedTotalChapters} (from source)`);
  }

  // Check for duplicates
  const duplicates = chapterNumbers.filter((num, idx) => 
    chapterNumbers.indexOf(num) !== idx
  );
  const uniqueDuplicates = [...new Set(duplicates)];

  if (uniqueDuplicates.length > 0) {
    warnings.push(`${uniqueDuplicates.length} duplicate chapter(s): ${uniqueDuplicates.slice(0, 5).join(', ')}${uniqueDuplicates.length > 5 ? '...' : ''}`);
  }

  // Check for gaps in sequence
  const gaps = [];
  for (let i = 0; i < chapterNumbers.length - 1; i++) {
    const current = chapterNumbers[i];
    const next = chapterNumbers[i + 1];
    const diff = next - current;
    
    if (diff > 1.5) { // Allow for .5 chapters
      const missingStart = Math.ceil(current + 0.5);
      const missingEnd = Math.floor(next - 0.5);
      if (missingStart <= missingEnd) {
        gaps.push({ start: missingStart, end: missingEnd });
      }
    }
  }

  if (gaps.length > 0) {
    const gapCount = gaps.reduce((sum, g) => sum + (g.end - g.start + 1), 0);
    issues.push(`${gapCount} missing chapter(s) detected in ${gaps.length} gap(s)`);
    gaps.slice(0, 3).forEach(g => {
      if (g.start === g.end) {
        warnings.push(`   Missing: Chapter ${g.start}`);
      } else {
        warnings.push(`   Missing: Chapters ${g.start}-${g.end}`);
      }
    });
    if (gaps.length > 3) {
      warnings.push(`   ... and ${gaps.length - 3} more gap(s)`);
    }
  } else {
    info.push(`No gaps detected in available sequence`);
  }

  // Check for expected completeness
  const actualUnique = new Set(chapterNumbers).size;
  let completeness;
  let completenessBase;

  if (expectedTotalChapters && expectedTotalChapters > 0) {
    // Use external data for accurate completeness
    completenessBase = expectedTotalChapters;
    completeness = (actualUnique / expectedTotalChapters * 100).toFixed(1);
  } else {
    // Fallback to local range-based calculation
    completenessBase = stats.maxChapter - stats.minChapter + 1;
    completeness = (actualUnique / completenessBase * 100).toFixed(1);
    warnings.push(`Using local range for completeness (no external data)`);
  }

  if (completeness >= 95) {
    info.push(`${completeness}% complete (${actualUnique}/${Math.ceil(completenessBase)} chapters)`);
  } else if (completeness >= 80) {
    warnings.push(`${completeness}% complete (${actualUnique}/${Math.ceil(completenessBase)} chapters)`);
  } else {
    issues.push(`Only ${completeness}% complete (${actualUnique}/${Math.ceil(completenessBase)} chapters)`);
  }

  // Additional warnings if using external data
  if (expectedTotalChapters && stats.maxChapter < expectedTotalChapters) {
    const missingFromEnd = expectedTotalChapters - stats.maxChapter;
    warnings.push(`Missing latest ${missingFromEnd} chapter(s) (up to ${expectedTotalChapters})`);
  }

  return { issues, warnings, info, stats, gaps, duplicates: uniqueDuplicates, completeness: parseFloat(completeness) };
}

function displayIntegrityReport(report, mangaUpdatesData = null) {
  const reportDiv = $("integrityReport");
  if (!reportDiv) return;

  const { issues, warnings, info } = report;
  const hasIssues = issues.length > 0;
  const hasWarnings = warnings.length > 0;

  let statusClass = "integrity-good";
  let statusIcon = "&#x2705;";
  let statusText = "All Good";

  if (hasIssues) {
    statusClass = "integrity-error";
    statusIcon = "&#x274C;";
    statusText = "Issues Found";
  } else if (hasWarnings) {
    statusClass = "integrity-warning";
    statusIcon = "!";
    statusText = "Warnings";
  }

  let mangaUpdatesSection = "";
  if (mangaUpdatesData && mangaUpdatesData.found) {
    mangaUpdatesSection = `
      <div class="integrity-section integrity-mangaupdates">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">MangaUpdates Data:</div>
        <div>Latest Chapter: ${mangaUpdatesData.latestChapter || "Unknown"}</div>
        <div>Status: ${mangaUpdatesData.status || "Unknown"}</div>
        ${mangaUpdatesData.url ? `<div><a href="${mangaUpdatesData.url}" target="_blank" style="color: var(--primary);">View on MangaUpdates →</a></div>` : ''}
      </div>
    `;
  }

  reportDiv.innerHTML = `
    <div class="integrity-report ${statusClass}">
      <div class="integrity-header">
        <span class="integrity-icon">${statusIcon}</span>
        <strong>Integrity Check: ${statusText}</strong>
        <button class="btn-close-report" onclick="closeIntegrityReport()">&#x2715;</button>
      </div>
      <div class="integrity-body">
        ${mangaUpdatesSection}
        ${issues.length > 0 ? `
          <div class="integrity-section integrity-issues">
            ${issues.map(issue => `<div>${issue}</div>`).join('')}
          </div>
        ` : ''}
        ${warnings.length > 0 ? `
          <div class="integrity-section integrity-warnings">
            ${warnings.map(warning => `<div>${warning}</div>`).join('')}
          </div>
        ` : ''}
        ${info.length > 0 ? `
          <div class="integrity-section integrity-info">
            ${info.map(i => `<div>${i}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;

  reportDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

window.closeIntegrityReport = function() {
  const reportDiv = $("integrityReport");
  if (reportDiv) reportDiv.innerHTML = '';
};

