import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from './kv_store.tsx';

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

/**
 * Background job scheduler for weekly academic data updates
 * This function should be called by a cron job or similar scheduling service
 */
export async function runWeeklyUpdates() {
  console.log('Starting weekly academic data updates...');
  
  try {
    // Get all users with scheduled updates enabled
    const users = await getScheduledUsers();
    console.log(`Found ${users.length} users for weekly updates`);
    
    // Process updates for each user
    for (const user of users) {
      try {
        await updateUserAcademicData(user.userId, user.scholarIds);
        console.log(`Updated data for user: ${user.userId}`);
        
        // Update the last sync timestamp
        await updateLastSyncTime(user.userId);
        
        // Add delay between requests to respect API rate limits
        await delay(2000);
        
      } catch (error) {
        console.error(`Failed to update data for user ${user.userId}:`, error);
        // Continue with other users even if one fails
      }
    }
    
    console.log('Weekly updates completed successfully');
    
  } catch (error) {
    console.error('Weekly updates failed:', error);
    throw error;
  }
}

/**
 * Get all users who have weekly updates enabled
 */
async function getScheduledUsers(): Promise<Array<{
  userId: string;
  scholarIds: {
    googleScholarId?: string;
    scopusId?: string;
    orcidId?: string;
    researcherId?: string;
  };
}>> {
  try {
    // Get all faculty profiles
    const profiles = await kv.getByPrefix('faculty_profile_');
    const users = [];
    
    for (const profile of profiles) {
      if (profile && profile.profileSetupComplete) {
        // Check if user has scheduled updates enabled
        const scheduleInfo = await kv.get(`scheduled_updates_${profile.userId}`);
        
        if (scheduleInfo && scheduleInfo.enabled) {
          users.push({
            userId: profile.userId,
            scholarIds: {
              googleScholarId: profile.googleScholarId,
              scopusId: profile.scopusId,
              orcidId: profile.orcidId,
              researcherId: profile.researcherId
            }
          });
        }
      }
    }
    
    return users;
    
  } catch (error) {
    console.error('Failed to get scheduled users:', error);
    return [];
  }
}

/**
 * Update academic data for a specific user
 */
async function updateUserAcademicData(
  userId: string, 
  scholarIds: {
    googleScholarId?: string;
    scopusId?: string;
    orcidId?: string;
    researcherId?: string;
  }
) {
  console.log(`Updating academic data for user: ${userId}`);
  
  // Fetch data from all academic sources
  await Promise.all([
    fetchGoogleScholarData(userId, scholarIds.googleScholarId),
    fetchScopusData(userId, scholarIds.scopusId),
    fetchWebOfScienceData(userId, scholarIds.researcherId),
    fetchORCIDData(userId, scholarIds.orcidId)
  ]);
  
  // Update statistics after fetching new data
  await updateAcademicStatistics(userId);
}

/**
 * Fetch data from Google Scholar
 */
async function fetchGoogleScholarData(userId: string, scholarId?: string) {
  if (!scholarId) return;
  
  try {
    console.log(`Fetching Google Scholar data for user ${userId}`);
    
    // TODO: Implement actual Google Scholar API integration
    // This would involve:
    // 1. Making API calls to Google Scholar (unofficial API or scraping)
    // 2. Parsing publication data
    // 3. Extracting citation counts
    // 4. Storing in database
    
    // For now, simulate data fetching
    await simulateDataFetch('Google Scholar', userId);
    
  } catch (error) {
    console.error(`Google Scholar fetch failed for user ${userId}:`, error);
  }
}

/**
 * Fetch data from Scopus
 */
async function fetchScopusData(userId: string, scopusId?: string) {
  if (!scopusId) return;
  
  try {
    console.log(`Fetching Scopus data for user ${userId}`);
    
    // TODO: Implement actual Scopus API integration
    // This would involve:
    // 1. Making authenticated API calls to Scopus
    // 2. Fetching author profile and publications
    // 3. Getting citation metrics and h-index
    // 4. Storing structured data
    
    await simulateDataFetch('Scopus', userId);
    
  } catch (error) {
    console.error(`Scopus fetch failed for user ${userId}:`, error);
  }
}

/**
 * Fetch data from Web of Science
 */
async function fetchWebOfScienceData(userId: string, researcherId?: string) {
  if (!researcherId) return;
  
  try {
    console.log(`Fetching Web of Science data for user ${userId}`);
    
    // TODO: Implement actual Web of Science API integration
    // This would involve:
    // 1. Making API calls to Web of Science
    // 2. Fetching publication records
    // 3. Getting impact factors and journal rankings
    // 4. Extracting citation data
    
    await simulateDataFetch('Web of Science', userId);
    
  } catch (error) {
    console.error(`Web of Science fetch failed for user ${userId}:`, error);
  }
}

/**
 * Fetch data from ORCID
 */
async function fetchORCIDData(userId: string, orcidId?: string) {
  if (!orcidId) return;
  
  try {
    console.log(`Fetching ORCID data for user ${userId}`);
    
    // TODO: Implement actual ORCID API integration
    // This would involve:
    // 1. Making API calls to ORCID public API
    // 2. Fetching comprehensive publication list
    // 3. Getting employment and education history
    // 4. Cross-referencing with other sources
    
    await simulateDataFetch('ORCID', userId);
    
  } catch (error) {
    console.error(`ORCID fetch failed for user ${userId}:`, error);
  }
}

/**
 * Simulate data fetching (placeholder for actual implementation)
 */
async function simulateDataFetch(source: string, userId: string) {
  // Simulate API delay
  await delay(1000 + Math.random() * 2000);
  
  // Log the simulation
  console.log(`Simulated ${source} data fetch for user ${userId}`);
}

/**
 * Update academic statistics after data fetch
 */
async function updateAcademicStatistics(userId: string) {
  try {
    // Get all user's academic data
    const [publications, conferences, books] = await Promise.all([
      kv.getByPrefix(`publication_${userId}_`),
      kv.getByPrefix(`conference_${userId}_`),
      kv.getByPrefix(`book_${userId}_`)
    ]);
    
    const currentYear = new Date().getFullYear();
    
    // Calculate updated statistics
    const publicationStats = {
      total: publications.length,
      thisYear: publications.filter(p => p.year === currentYear).length,
      journals: publications.filter(p => p.type === 'journal').length
    };
    
    const conferenceStats = {
      total: conferences.length,
      international: conferences.filter(c => c.type === 'International').length,
      national: conferences.filter(c => c.type === 'National').length
    };
    
    const bookStats = {
      total: books.length,
      books: books.filter(b => b.type === 'Book').length,
      chapters: books.filter(b => b.type === 'Book Chapter').length
    };
    
    const totalCitations = publications.reduce((sum, p) => sum + (p.citations || 0), 0);
    const citationStats = {
      total: totalCitations,
      hIndex: calculateHIndex(publications),
      i10Index: publications.filter(p => (p.citations || 0) >= 10).length
    };
    
    // Store updated statistics
    await Promise.all([
      kv.set(`publications_stats_${userId}`, publicationStats),
      kv.set(`conferences_stats_${userId}`, conferenceStats),
      kv.set(`books_stats_${userId}`, bookStats),
      kv.set(`citations_stats_${userId}`, citationStats)
    ]);
    
    console.log(`Updated statistics for user ${userId}`);
    
  } catch (error) {
    console.error(`Failed to update statistics for user ${userId}:`, error);
  }
}

/**
 * Calculate H-Index from publications
 */
function calculateHIndex(publications: any[]): number {
  const citations = publications
    .map(p => p.citations || 0)
    .sort((a, b) => b - a);
  
  let hIndex = 0;
  for (let i = 0; i < citations.length; i++) {
    if (citations[i] >= i + 1) {
      hIndex = i + 1;
    } else {
      break;
    }
  }
  
  return hIndex;
}

/**
 * Update last sync timestamp for a user
 */
async function updateLastSyncTime(userId: string) {
  try {
    const profile = await kv.get(`faculty_profile_${userId}`);
    if (profile) {
      await kv.set(`faculty_profile_${userId}`, {
        ...profile,
        lastDataSync: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`Failed to update last sync time for user ${userId}:`, error);
  }
}

/**
 * Utility function to add delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Setup Deno cron job for weekly updates
 * This should be called once to establish the schedule
 */
export function setupWeeklySchedule() {
  // TODO: Implement with Deno.cron when available, or use external cron service
  console.log('Weekly update schedule would be configured here');
  
  // Example cron schedule for Sundays at 2 AM UTC:
  // Deno.cron("Weekly Academic Updates", "0 2 * * 0", runWeeklyUpdates);
}

/**
 * Health check for the scheduler
 */
export async function schedulerHealthCheck(): Promise<{ status: string; lastRun?: string; activeUsers: number }> {
  try {
    const users = await getScheduledUsers();
    
    return {
      status: 'healthy',
      activeUsers: users.length,
      lastRun: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      status: 'error',
      activeUsers: 0
    };
  }
}