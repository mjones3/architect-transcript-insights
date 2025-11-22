import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface VoiceCharacteristics {
  pitch: number;
  tone: number;
  pace: number;
  accent?: string;
  spectralCentroid?: number;
  mfccFeatures?: number[];
  formantFreqs?: number[];
}

export interface SpeakerProfile {
  id: string;
  name: string;
  displayName: string;
  voiceCharacteristics: VoiceCharacteristics;
  confidence: number;
  sampleCount: number;
  lastSeen: Date;
  createdAt: Date;
  meetings: string[]; // Meeting IDs where this speaker appeared
  verified: boolean; // Whether the user has confirmed this speaker's identity
}

export interface SpeakerMatch {
  speakerId: string;
  speakerName: string;
  confidence: number;
  isNewSpeaker: boolean;
}

class SpeakerRecognitionService {
  private speakerProfiles: Map<string, SpeakerProfile> = new Map();
  private profilesFile: string;
  private initialized = false;

  constructor() {
    this.profilesFile = path.join(process.cwd(), 'data', 'speaker-profiles.json');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(path.dirname(this.profilesFile), { recursive: true });
      
      // Load existing profiles
      await this.loadProfiles();
      this.initialized = true;
    } catch (error) {
      console.warn('Could not initialize speaker profiles:', error);
      this.initialized = true; // Continue anyway
    }
  }

  private async loadProfiles(): Promise<void> {
    try {
      const data = await fs.readFile(this.profilesFile, 'utf-8');
      const profiles: SpeakerProfile[] = JSON.parse(data);
      
      this.speakerProfiles.clear();
      profiles.forEach(profile => {
        // Convert date strings back to Date objects
        profile.lastSeen = new Date(profile.lastSeen);
        profile.createdAt = new Date(profile.createdAt);
        this.speakerProfiles.set(profile.id, profile);
      });
      
      console.log(`Loaded ${profiles.length} speaker profiles`);
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      console.log('No existing speaker profiles found, starting fresh');
    }
  }

  private async saveProfiles(): Promise<void> {
    try {
      const profiles = Array.from(this.speakerProfiles.values());
      await fs.writeFile(this.profilesFile, JSON.stringify(profiles, null, 2));
    } catch (error) {
      console.error('Failed to save speaker profiles:', error);
    }
  }

  /**
   * Analyze audio characteristics to extract voice features
   * This is a simplified implementation - in production you'd use proper audio analysis
   */
  private analyzeVoiceCharacteristics(audioData: any): VoiceCharacteristics {
    // This is a mock implementation
    // In a real implementation, you would:
    // 1. Extract MFCC features
    // 2. Analyze pitch and formant frequencies
    // 3. Calculate spectral features
    // 4. Use libraries like Web Audio API or external services
    
    // For now, generate pseudo-characteristics based on audio data hash
    const hash = crypto.createHash('md5').update(JSON.stringify(audioData)).digest('hex');
    const seed = parseInt(hash.substr(0, 8), 16);
    
    // Generate consistent but varied characteristics
    return {
      pitch: 80 + (seed % 200), // 80-280 Hz range
      tone: (seed % 100) / 100, // 0-1 normalized
      pace: 0.8 + (seed % 40) / 100, // 0.8-1.2 pace multiplier
      spectralCentroid: 1000 + (seed % 3000), // 1000-4000 Hz
      mfccFeatures: Array.from({ length: 13 }, (_, i) => (seed + i * 37) % 100 / 100),
      formantFreqs: [
        200 + (seed % 300), // F1: 200-500 Hz
        800 + (seed % 1200), // F2: 800-2000 Hz
        2000 + (seed % 1500) // F3: 2000-3500 Hz
      ]
    };
  }

  /**
   * Calculate similarity between two voice characteristic profiles
   */
  private calculateSimilarity(voice1: VoiceCharacteristics, voice2: VoiceCharacteristics): number {
    let totalSimilarity = 0;
    let weights = 0;

    // Pitch similarity (weight: 0.3)
    const pitchDiff = Math.abs(voice1.pitch - voice2.pitch);
    const pitchSim = Math.max(0, 1 - pitchDiff / 100); // Normalize to 0-1
    totalSimilarity += pitchSim * 0.3;
    weights += 0.3;

    // Tone similarity (weight: 0.2)
    const toneDiff = Math.abs(voice1.tone - voice2.tone);
    const toneSim = Math.max(0, 1 - toneDiff);
    totalSimilarity += toneSim * 0.2;
    weights += 0.2;

    // Pace similarity (weight: 0.15)
    const paceDiff = Math.abs(voice1.pace - voice2.pace);
    const paceSim = Math.max(0, 1 - paceDiff);
    totalSimilarity += paceSim * 0.15;
    weights += 0.15;

    // MFCC features similarity (weight: 0.25)
    if (voice1.mfccFeatures && voice2.mfccFeatures) {
      let mfccSim = 0;
      const minLength = Math.min(voice1.mfccFeatures.length, voice2.mfccFeatures.length);
      
      for (let i = 0; i < minLength; i++) {
        const diff = Math.abs(voice1.mfccFeatures[i] - voice2.mfccFeatures[i]);
        mfccSim += Math.max(0, 1 - diff);
      }
      mfccSim /= minLength;
      totalSimilarity += mfccSim * 0.25;
      weights += 0.25;
    }

    // Formant frequencies similarity (weight: 0.1)
    if (voice1.formantFreqs && voice2.formantFreqs) {
      let formantSim = 0;
      const minLength = Math.min(voice1.formantFreqs.length, voice2.formantFreqs.length);
      
      for (let i = 0; i < minLength; i++) {
        const diff = Math.abs(voice1.formantFreqs[i] - voice2.formantFreqs[i]);
        formantSim += Math.max(0, 1 - diff / 1000); // Normalize by 1000 Hz
      }
      formantSim /= minLength;
      totalSimilarity += formantSim * 0.1;
      weights += 0.1;
    }

    return weights > 0 ? totalSimilarity / weights : 0;
  }

  /**
   * Identify speaker from audio characteristics
   */
  async identifySpeaker(audioData: any, meetingId: string): Promise<SpeakerMatch> {
    await this.initialize();

    const voiceChars = this.analyzeVoiceCharacteristics(audioData);
    let bestMatch: { profile: SpeakerProfile; similarity: number } | null = null;
    const threshold = 0.75; // Similarity threshold for recognition

    // Compare against all known profiles
    for (const profile of this.speakerProfiles.values()) {
      const similarity = this.calculateSimilarity(voiceChars, profile.voiceCharacteristics);
      
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { profile, similarity };
      }
    }

    // If we have a good match above threshold
    if (bestMatch && bestMatch.similarity >= threshold) {
      const profile = bestMatch.profile;
      
      // Update the profile with new data
      await this.updateSpeakerProfile(profile.id, voiceChars, meetingId);
      
      return {
        speakerId: profile.id,
        speakerName: profile.displayName,
        confidence: bestMatch.similarity,
        isNewSpeaker: false
      };
    }

    // Create new speaker profile
    const newSpeaker = await this.createNewSpeakerProfile(voiceChars, meetingId);
    
    return {
      speakerId: newSpeaker.id,
      speakerName: newSpeaker.displayName,
      confidence: 1.0, // New speaker, so we're confident it's unique
      isNewSpeaker: true
    };
  }

  /**
   * Create a new speaker profile
   */
  private async createNewSpeakerProfile(voiceChars: VoiceCharacteristics, meetingId: string): Promise<SpeakerProfile> {
    const speakerNumber = this.speakerProfiles.size + 1;
    const speakerId = `speaker_${Date.now()}_${speakerNumber}`;
    
    const profile: SpeakerProfile = {
      id: speakerId,
      name: speakerId,
      displayName: `Speaker ${speakerNumber}`,
      voiceCharacteristics: voiceChars,
      confidence: 1.0,
      sampleCount: 1,
      lastSeen: new Date(),
      createdAt: new Date(),
      meetings: [meetingId],
      verified: false
    };

    this.speakerProfiles.set(speakerId, profile);
    await this.saveProfiles();
    
    console.log(`Created new speaker profile: ${profile.displayName}`);
    return profile;
  }

  /**
   * Update an existing speaker profile with new voice data
   */
  private async updateSpeakerProfile(speakerId: string, newVoiceChars: VoiceCharacteristics, meetingId: string): Promise<void> {
    const profile = this.speakerProfiles.get(speakerId);
    if (!profile) return;

    // Update with weighted average (existing data has more weight)
    const existingWeight = Math.min(profile.sampleCount, 10); // Cap at 10 for stability
    const newWeight = 1;
    const totalWeight = existingWeight + newWeight;

    profile.voiceCharacteristics = {
      pitch: (profile.voiceCharacteristics.pitch * existingWeight + newVoiceChars.pitch * newWeight) / totalWeight,
      tone: (profile.voiceCharacteristics.tone * existingWeight + newVoiceChars.tone * newWeight) / totalWeight,
      pace: (profile.voiceCharacteristics.pace * existingWeight + newVoiceChars.pace * newWeight) / totalWeight,
      spectralCentroid: profile.voiceCharacteristics.spectralCentroid && newVoiceChars.spectralCentroid
        ? (profile.voiceCharacteristics.spectralCentroid * existingWeight + newVoiceChars.spectralCentroid * newWeight) / totalWeight
        : newVoiceChars.spectralCentroid,
    };

    // Update MFCC features if available
    if (profile.voiceCharacteristics.mfccFeatures && newVoiceChars.mfccFeatures) {
      profile.voiceCharacteristics.mfccFeatures = profile.voiceCharacteristics.mfccFeatures.map((existing, i) => {
        const newFeature = newVoiceChars.mfccFeatures![i] || existing;
        return (existing * existingWeight + newFeature * newWeight) / totalWeight;
      });
    }

    profile.sampleCount++;
    profile.lastSeen = new Date();
    
    if (!profile.meetings.includes(meetingId)) {
      profile.meetings.push(meetingId);
    }

    await this.saveProfiles();
  }

  /**
   * Get all speaker profiles
   */
  async getAllSpeakers(): Promise<SpeakerProfile[]> {
    await this.initialize();
    return Array.from(this.speakerProfiles.values());
  }

  /**
   * Update speaker display name
   */
  async updateSpeakerName(speakerId: string, newName: string): Promise<boolean> {
    await this.initialize();
    
    const profile = this.speakerProfiles.get(speakerId);
    if (!profile) return false;

    profile.displayName = newName;
    profile.verified = true;
    await this.saveProfiles();
    
    console.log(`Updated speaker ${speakerId} name to: ${newName}`);
    return true;
  }

  /**
   * Merge two speaker profiles (when user identifies them as the same person)
   */
  async mergeSpeakers(primarySpeakerId: string, secondarySpeakerId: string): Promise<boolean> {
    await this.initialize();
    
    const primary = this.speakerProfiles.get(primarySpeakerId);
    const secondary = this.speakerProfiles.get(secondarySpeakerId);
    
    if (!primary || !secondary) return false;

    // Merge voice characteristics using weighted average
    const totalSamples = primary.sampleCount + secondary.sampleCount;
    const primaryWeight = primary.sampleCount / totalSamples;
    const secondaryWeight = secondary.sampleCount / totalSamples;

    primary.voiceCharacteristics = {
      pitch: primary.voiceCharacteristics.pitch * primaryWeight + secondary.voiceCharacteristics.pitch * secondaryWeight,
      tone: primary.voiceCharacteristics.tone * primaryWeight + secondary.voiceCharacteristics.tone * secondaryWeight,
      pace: primary.voiceCharacteristics.pace * primaryWeight + secondary.voiceCharacteristics.pace * secondaryWeight,
    };

    // Merge meetings
    primary.meetings = [...new Set([...primary.meetings, ...secondary.meetings])];
    primary.sampleCount = totalSamples;
    primary.lastSeen = new Date(Math.max(primary.lastSeen.getTime(), secondary.lastSeen.getTime()));

    // Remove secondary profile
    this.speakerProfiles.delete(secondarySpeakerId);
    await this.saveProfiles();

    console.log(`Merged speaker ${secondarySpeakerId} into ${primarySpeakerId}`);
    return true;
  }

  /**
   * Delete a speaker profile
   */
  async deleteSpeaker(speakerId: string): Promise<boolean> {
    await this.initialize();
    
    const deleted = this.speakerProfiles.delete(speakerId);
    if (deleted) {
      await this.saveProfiles();
      console.log(`Deleted speaker profile: ${speakerId}`);
    }
    
    return deleted;
  }

  /**
   * Get speaker statistics
   */
  async getSpeakerStats(): Promise<any> {
    await this.initialize();
    
    const speakers = Array.from(this.speakerProfiles.values());
    return {
      totalSpeakers: speakers.length,
      verifiedSpeakers: speakers.filter(s => s.verified).length,
      averageSampleCount: speakers.reduce((sum, s) => sum + s.sampleCount, 0) / speakers.length,
      recentSpeakers: speakers.filter(s => 
        new Date().getTime() - s.lastSeen.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
      ).length
    };
  }
}

// Export singleton instance
export const speakerRecognition = new SpeakerRecognitionService();