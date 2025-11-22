import { 
  VoiceIDClient, 
  CreateDomainCommand,
  DescribeDomainCommand,
  CreateSpeakerCommand,
  EvaluateSessionCommand,
  StartSpeakerEnrollmentJobCommand,
  ListSpeakersCommand,
  DeleteSpeakerCommand,
  DescribeSpeakerEnrollmentJobCommand
} from '@aws-sdk/client-voice-id';

const voiceIdClient = new VoiceIDClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const DOMAIN_ID = 'architect-transcript-insights';

export interface AWSSpeakerProfile {
  speakerId: string;
  displayName: string;
  enrollmentStatus: 'ENROLLING' | 'ENROLLED' | 'FAILED';
  enrollmentJobId?: string;
  createdAt: Date;
  lastUsed?: Date;
}

export interface SpeakerIdentificationResult {
  speakerId?: string;
  confidence: number;
  identificationStatus: 'ACCEPT' | 'REJECT' | 'NOT_SURE';
  matchedSpeakerName?: string;
  isNewSpeaker: boolean;
}

class AWSSpeakerRecognitionService {
  private domainInitialized = false;

  async initialize(): Promise<void> {
    if (this.domainInitialized) return;

    try {
      // Try to get the existing domain
      await voiceIdClient.send(new DescribeDomainCommand({ DomainId: DOMAIN_ID }));
      console.log(`Voice ID domain ${DOMAIN_ID} already exists`);
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        // Create the domain
        try {
          await voiceIdClient.send(new CreateDomainCommand({
            Name: DOMAIN_ID,
            Description: 'Domain for Architect Transcript Insights speaker recognition',
            ServerSideEncryptionConfiguration: {
              KmsKeyId: 'alias/aws/voiceid' // Use default AWS managed key
            }
          }));
          console.log(`Created Voice ID domain: ${DOMAIN_ID}`);
        } catch (createError) {
          console.error('Failed to create Voice ID domain:', createError);
          throw createError;
        }
      } else {
        console.error('Failed to initialize Voice ID domain:', error);
        throw error;
      }
    }

    this.domainInitialized = true;
  }

  /**
   * Identify speaker using AWS Voice ID
   */
  async identifySpeaker(audioBuffer: Buffer, sessionId: string): Promise<SpeakerIdentificationResult> {
    await this.initialize();

    try {
      // Convert audio buffer to base64 for AWS Voice ID
      const audioBase64 = audioBuffer.toString('base64');

      const command = new EvaluateSessionCommand({
        DomainId: DOMAIN_ID,
        SessionNameOrId: sessionId,
        AudioInputConfiguration: {
          AudioEncoding: 'WAV', // Adjust based on your audio format
          AudioSampleRate: 16000
        }
      });

      // Note: AWS Voice ID requires streaming audio in real-time
      // This is a simplified implementation - in production you'd use streaming
      const response = await voiceIdClient.send(command);

      if (response.AuthenticationResult?.Decision === 'ACCEPT') {
        return {
          speakerId: response.AuthenticationResult.CustomerSpeakerId,
          confidence: response.AuthenticationResult.Score || 0,
          identificationStatus: 'ACCEPT',
          matchedSpeakerName: await this.getSpeakerDisplayName(response.AuthenticationResult.CustomerSpeakerId),
          isNewSpeaker: false
        };
      }

      // If no match found, it might be a new speaker
      return {
        confidence: 0,
        identificationStatus: 'NOT_SURE',
        isNewSpeaker: true
      };

    } catch (error) {
      console.error('AWS Voice ID identification error:', error);
      
      // Fallback to confidence scoring
      return {
        confidence: 0,
        identificationStatus: 'REJECT',
        isNewSpeaker: true
      };
    }
  }

  /**
   * Enroll a new speaker with AWS Voice ID
   */
  async enrollSpeaker(
    speakerDisplayName: string, 
    audioSamples: Buffer[], 
    customSpeakerId?: string
  ): Promise<AWSSpeakerProfile> {
    await this.initialize();

    const speakerId = customSpeakerId || `speaker_${Date.now()}`;

    try {
      // Create speaker in Voice ID
      await voiceIdClient.send(new CreateSpeakerCommand({
        DomainId: DOMAIN_ID,
        CustomerSpeakerId: speakerId,
        Tags: [
          {
            Key: 'DisplayName',
            Value: speakerDisplayName
          },
          {
            Key: 'Source',
            Value: 'ArchitectTranscriptInsights'
          }
        ]
      }));

      // Start enrollment job with audio samples
      const enrollmentResponse = await voiceIdClient.send(new StartSpeakerEnrollmentJobCommand({
        DomainId: DOMAIN_ID,
        JobName: `enrollment_${speakerId}_${Date.now()}`,
        DataAccessRoleArn: process.env.VOICE_ID_ROLE_ARN, // IAM role for Voice ID
        EnrollmentConfig: {
          ExistingEnrollmentAction: 'OVERWRITE',
          FraudDetectionConfig: {
            FraudDetectionAction: 'IGNORE' // or 'FAIL' for stricter validation
          }
        },
        InputDataConfig: {
          S3Uri: await this.uploadAudioToS3(audioSamples, speakerId) // Upload audio to S3
        },
        OutputDataConfig: {
          S3Uri: `s3://${process.env.S3_BUCKET_NAME}/voice-id-output/`
        }
      }));

      return {
        speakerId,
        displayName: speakerDisplayName,
        enrollmentStatus: 'ENROLLING',
        enrollmentJobId: enrollmentResponse.JobId,
        createdAt: new Date()
      };

    } catch (error) {
      console.error('Failed to enroll speaker:', error);
      throw error;
    }
  }

  /**
   * Check enrollment job status
   */
  async checkEnrollmentStatus(jobId: string): Promise<'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED'> {
    try {
      const response = await voiceIdClient.send(new DescribeSpeakerEnrollmentJobCommand({
        DomainId: DOMAIN_ID,
        JobId: jobId
      }));
      
      return response.Job?.JobStatus || 'FAILED';
    } catch (error) {
      console.error('Failed to check enrollment status:', error);
      return 'FAILED';
    }
  }

  /**
   * List all enrolled speakers
   */
  async listSpeakers(): Promise<AWSSpeakerProfile[]> {
    await this.initialize();

    try {
      const response = await voiceIdClient.send(new ListSpeakersCommand({
        DomainId: DOMAIN_ID,
        MaxResults: 100
      }));

      return (response.Speakers || []).map(speaker => ({
        speakerId: speaker.CustomerSpeakerId || '',
        displayName: this.extractDisplayNameFromTags(speaker.Tags),
        enrollmentStatus: speaker.Status as any || 'FAILED',
        createdAt: speaker.CreatedAt || new Date(),
        lastUsed: speaker.UpdatedAt
      }));

    } catch (error) {
      console.error('Failed to list speakers:', error);
      return [];
    }
  }

  /**
   * Delete a speaker from Voice ID
   */
  async deleteSpeaker(speakerId: string): Promise<boolean> {
    await this.initialize();

    try {
      await voiceIdClient.send(new DeleteSpeakerCommand({
        DomainId: DOMAIN_ID,
        CustomerSpeakerId: speakerId
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to delete speaker:', error);
      return false;
    }
  }

  /**
   * Update speaker display name
   */
  async updateSpeakerName(speakerId: string, newDisplayName: string): Promise<boolean> {
    // Voice ID doesn't directly support updating speaker metadata
    // We could store this mapping in DynamoDB or our local storage
    console.log(`Updating speaker ${speakerId} name to ${newDisplayName}`);
    return true;
  }

  private extractDisplayNameFromTags(tags?: any[]): string {
    if (!tags) return 'Unknown Speaker';
    
    const displayNameTag = tags.find(tag => tag.Key === 'DisplayName');
    return displayNameTag?.Value || 'Unknown Speaker';
  }

  private async getSpeakerDisplayName(speakerId?: string): Promise<string> {
    if (!speakerId) return 'Unknown Speaker';
    
    try {
      const speakers = await this.listSpeakers();
      const speaker = speakers.find(s => s.speakerId === speakerId);
      return speaker?.displayName || speakerId;
    } catch (error) {
      return speakerId;
    }
  }

  private async uploadAudioToS3(audioSamples: Buffer[], speakerId: string): Promise<string> {
    // This would upload the audio samples to S3 for Voice ID processing
    // Implementation depends on your S3 setup
    const s3Key = `voice-id-enrollment/${speakerId}/${Date.now()}.wav`;
    const s3Uri = `s3://${process.env.S3_BUCKET_NAME}/${s3Key}`;
    
    // TODO: Implement S3 upload logic here
    console.log(`Would upload audio samples to ${s3Uri}`);
    
    return s3Uri;
  }
}

// Export singleton instance
export const awsSpeakerRecognition = new AWSSpeakerRecognitionService();