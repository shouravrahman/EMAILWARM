import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { createClient } from "@/utils/supabase/server";

export interface EmailContext {
  senderName: string;
  senderEmail: string;
  senderCompany?: string;
  senderTitle?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientCompany?: string;
  industry?: string;
  previousEmails?: Array<{
    subject: string;
    body: string;
    timestamp: string;
    direction: 'sent' | 'received';
  }>;
  campaignGoal?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'formal';
  relationship?: 'cold' | 'warm' | 'existing';
}

export interface EmailGenerationRequest {
  type: 'introduction' | 'follow_up' | 'reply' | 'thank_you' | 'networking' | 'check_in';
  context: EmailContext;
  constraints?: {
    maxLength?: number;
    includeSignature?: boolean;
    includeCallToAction?: boolean;
    avoidWords?: string[];
    mustIncludeWords?: string[];
  };
}

export interface EmailGenerationResponse {
  subject: string;
  body: string;
  tone: string;
  confidence: number;
  suggestions?: string[];
  reasoning?: string;
}

export interface EmailAnalysisResponse {
  spamScore: number;
  deliverabilityScore: number;
  engagementScore: number;
  reputationImpact: number;
  suggestions: string[];
  issues: Array<{
    type: 'spam_risk' | 'deliverability' | 'engagement' | 'compliance' | 'reputation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    suggestion: string;
    impact: number;
  }>;
  optimizations: Array<{
    type: 'subject' | 'content' | 'timing' | 'personalization';
    suggestion: string;
    expectedImprovement: number;
  }>;
}


export class AdvancedAIService {
	private genAI: GoogleGenerativeAI;
	private model: any;
	private conversationModel: any;

	constructor() {
		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			throw new Error("GEMINI_API_KEY environment variable is required");
		}

		this.genAI = new GoogleGenerativeAI(apiKey);

		// Main model for email generation
		this.model = this.genAI.getGenerativeModel({
			model: "gemini-1.5-flash",
			generationConfig: {
				temperature: 0.7,
				topK: 40,
				topP: 0.95,
				maxOutputTokens: 2048,
			},
			safetySettings: [
				{
					category: HarmCategory.HARM_CATEGORY_HARASSMENT,
					threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
				},
				{
					category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
					threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
				},
				{
					category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
					threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
				},
				{
					category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
					threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
				},
			],
		});

		// Conversation-aware model for context understanding
		this.conversationModel = this.genAI.getGenerativeModel({
			model: "gemini-1.5-flash",
			generationConfig: {
				temperature: 0.6,
				topK: 30,
				topP: 0.9,
				maxOutputTokens: 1024,
			},
		});
	}

	async generateContextualEmail(
		request: EmailGenerationRequest
	): Promise<EmailGenerationResponse> {
		try {
			const prompt = this.buildAdvancedEmailPrompt(request);
			const result = await this.model.generateContent(prompt);
			const response = await result.response;
			const text = response.text();

			const emailResponse = this.parseAdvancedEmailResponse(
				text,
				request
			);

			// Log generation for learning
			await this.logEmailGeneration(request, emailResponse);

			return emailResponse;
		} catch (error) {
			console.error("Error generating contextual email:", error);
			throw new Error("Failed to generate email content");
		}
	}

	async analyzeEmailAdvanced(
		subject: string,
		body: string,
		context?: EmailContext
	): Promise<EmailAnalysisResponse> {
		try {
			const prompt = this.buildAdvancedAnalysisPrompt(
				subject,
				body,
				context
			);
			const result = await this.model.generateContent(prompt);
			const response = await result.response;
			const text = response.text();

			return this.parseAdvancedAnalysisResponse(text);
		} catch (error) {
			console.error("Error analyzing email:", error);
			throw new Error("Failed to analyze email content");
		}
	}

	async optimizeEmailSequence(
		emails: Array<{ subject: string; body: string; timestamp: string }>
	): Promise<{
		sequenceScore: number;
		improvements: string[];
		nextEmailSuggestion: {
			timing: string;
			type: string;
			reasoning: string;
		};
	}> {
		try {
			const prompt = `
        Analyze this email sequence for warmup effectiveness:

        ${emails
			.map(
				(email, i) => `
        Email ${i + 1} (${email.timestamp}):
        Subject: ${email.subject}
        Body: ${email.body}
        `
			)
			.join("\n")}

        Evaluate:
        1. Natural conversation flow
        2. Appropriate timing between emails
        3. Content variety and authenticity
        4. Spam risk factors
        5. Engagement potential

        Provide:
        - Overall sequence score (0-100)
        - Specific improvements
        - Next email timing and type recommendation

        Format as JSON:
        {
          "sequenceScore": 85,
          "improvements": ["suggestion1", "suggestion2"],
          "nextEmailSuggestion": {
            "timing": "3-5 days",
            "type": "follow_up",
            "reasoning": "explanation"
          }
        }
      `;

			const result = await this.conversationModel.generateContent(prompt);
			const response = await result.response;
			const text = response.text();

			return this.parseSequenceAnalysis(text);
		} catch (error) {
			console.error("Error optimizing email sequence:", error);
			return {
				sequenceScore: 70,
				improvements: ["Continue with natural conversation flow"],
				nextEmailSuggestion: {
					timing: "2-3 days",
					type: "follow_up",
					reasoning: "Maintain engagement without being pushy",
				},
			};
		}
	}

	private buildAdvancedEmailPrompt(request: EmailGenerationRequest): string {
		const { type, context, constraints } = request;

		let conversationHistory = "";
		if (context.previousEmails && context.previousEmails.length > 0) {
			conversationHistory = `
        Previous conversation history:
        ${context.previousEmails
			.map(
				(email) => `
        ${email.direction === "sent" ? "You sent" : "They sent"} (${
					email.timestamp
				}):
        Subject: ${email.subject}
        Body: ${email.body}
        `
			)
			.join("\n")}
      `;
		}

		return `
      You are an expert email copywriter specializing in email warmup campaigns. Generate a highly natural, human-like email that will improve sender reputation.

      Email Type: ${type}
      Relationship Level: ${context.relationship || "cold"}

      Sender Context:
      - Name: ${context.senderName}
      - Email: ${context.senderEmail}
      - Company: ${context.senderCompany || "Not specified"}
      - Title: ${context.senderTitle || "Professional"}

      Recipient Context:
      - Name: ${context.recipientName || "Professional contact"}
      - Email: ${context.recipientEmail || "Not specified"}
      - Company: ${context.recipientCompany || "Not specified"}
      - Industry: ${context.industry || "General business"}

      ${conversationHistory}

      Campaign Goal: ${
			context.campaignGoal ||
			"Build sender reputation through natural conversations"
		}
      Desired Tone: ${context.tone || "professional"}

      Constraints:
      - Maximum length: ${constraints?.maxLength || 150} words
      - Include signature: ${constraints?.includeSignature !== false}
      - Include call to action: ${constraints?.includeCallToAction !== false}
      ${
			constraints?.avoidWords?.length
				? `- Avoid these words: ${constraints.avoidWords.join(", ")}`
				: ""
		}
      ${
			constraints?.mustIncludeWords?.length
				? `- Must include: ${constraints.mustIncludeWords.join(", ")}`
				: ""
		}

      CRITICAL REQUIREMENTS for email warmup:
      1. Make it sound completely natural and human-written
      2. Avoid any sales language or promotional content
      3. Create genuine value in the conversation
      4. Use natural language patterns and varied sentence structure
      5. Include subtle personalization that shows research
      6. Maintain appropriate context from previous emails
      7. Ensure the email would pass spam filters
      8. Create content that encourages natural responses
      9. Use industry-appropriate language and references
      10. Make timing and follow-up feel organic

      Generate an email that a real person would write in this situation. Focus on building genuine professional relationships.

      Format your response as JSON:
      {
        "subject": "Natural, engaging subject line",
        "body": "Complete email body with proper formatting",
        "tone": "actual tone achieved",
        "confidence": 0.95,
        "reasoning": "Brief explanation of approach taken"
      }
    `;
	}

	private buildAdvancedAnalysisPrompt(
		subject: string,
		body: string,
		context?: EmailContext
	): string {
		return `
      Analyze this email for warmup effectiveness, spam risk, and deliverability:

      Subject: "${subject}"

      Body:
      "${body}"

      ${
			context
				? `
      Context:
      - Sender: ${context.senderName} (${context.senderEmail})
      - Recipient: ${context.recipientName || "Unknown"} (${
						context.recipientEmail || "Unknown"
				  })
      - Relationship: ${context.relationship || "Unknown"}
      - Industry: ${context.industry || "Unknown"}
      `
				: ""
		}

      Provide comprehensive analysis:

      1. SPAM SCORE (0-100): Likelihood of being flagged as spam
      2. DELIVERABILITY SCORE (0-100): Probability of reaching inbox
      3. ENGAGEMENT SCORE (0-100): Likelihood of recipient engagement
      4. REPUTATION IMPACT (0-100): Effect on sender reputation

      Analyze for:
      - Spam trigger words and phrases
      - Subject line effectiveness
      - Content authenticity and naturalness
      - Personalization quality
      - Call-to-action appropriateness
      - Professional tone and language
      - Length and readability
      - Compliance with email best practices

      Identify specific issues and provide actionable optimizations.

      Format as JSON:
      {
        "spamScore": 15,
        "deliverabilityScore": 85,
        "engagementScore": 75,
        "reputationImpact": 80,
        "suggestions": ["specific actionable suggestions"],
        "issues": [
          {
            "type": "spam_risk",
            "severity": "low",
            "message": "Issue description",
            "suggestion": "How to fix",
            "impact": 5
          }
        ],
        "optimizations": [
          {
            "type": "subject",
            "suggestion": "Specific improvement",
            "expectedImprovement": 10
          }
        ]
      }
    `;
	}

	private parseAdvancedEmailResponse(
		text: string,
		request: EmailGenerationRequest
	): EmailGenerationResponse {
		try {
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				return {
					subject: parsed.subject || "Professional Email",
					body: parsed.body || text,
					tone: parsed.tone || request.context.tone || "professional",
					confidence: Math.min(
						Math.max(parsed.confidence || 0.8, 0),
						1
					),
					suggestions: parsed.suggestions || [],
					reasoning:
						parsed.reasoning || "Generated using advanced AI",
				};
			}
		} catch (error) {
			console.warn("Failed to parse JSON response, using fallback");
		}

		// Fallback parsing
		const lines = text.split("\n").filter((line) => line.trim());
		const subject =
			this.extractSubject(text) || "Professional Communication";
		const body = this.extractBody(text) || text;

		return {
			subject: subject.replace(/['"]/g, "").trim(),
			body: body.trim(),
			tone: request.context.tone || "professional",
			confidence: 0.7,
			suggestions: [],
			reasoning: "Generated with fallback parsing",
		};
	}

	private parseAdvancedAnalysisResponse(text: string): EmailAnalysisResponse {
		try {
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]);
				return {
					spamScore: Math.max(
						0,
						Math.min(100, parsed.spamScore || 0)
					),
					deliverabilityScore: Math.max(
						0,
						Math.min(100, parsed.deliverabilityScore || 80)
					),
					engagementScore: Math.max(
						0,
						Math.min(100, parsed.engagementScore || 60)
					),
					reputationImpact: Math.max(
						0,
						Math.min(100, parsed.reputationImpact || 70)
					),
					suggestions: Array.isArray(parsed.suggestions)
						? parsed.suggestions
						: [],
					issues: Array.isArray(parsed.issues) ? parsed.issues : [],
					optimizations: Array.isArray(parsed.optimizations)
						? parsed.optimizations
						: [],
				};
			}
		} catch (error) {
			console.warn("Failed to parse analysis response, using fallback");
		}

		// Fallback analysis
		return this.performFallbackAnalysis(text);
	}

	private parseSequenceAnalysis(text: string): any {
		try {
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				return JSON.parse(jsonMatch[0]);
			}
		} catch (error) {
			console.warn("Failed to parse sequence analysis");
		}

		return {
			sequenceScore: 70,
			improvements: ["Continue with natural conversation flow"],
			nextEmailSuggestion: {
				timing: "2-3 days",
				type: "follow_up",
				reasoning: "Maintain engagement",
			},
		};
	}

	private extractSubject(text: string): string | null {
		const subjectMatch = text.match(
			/(?:subject|title):\s*["']?([^"'\n]+)["']?/i
		);
		return subjectMatch ? subjectMatch[1].trim() : null;
	}

	private extractBody(text: string): string | null {
		const bodyMatch = text.match(
			/(?:body|content|message):\s*["']?([\s\S]+?)["']?(?:\n\n|\n"|\n}|$)/i
		);
		return bodyMatch ? bodyMatch[1].trim() : null;
	}

	private performFallbackAnalysis(content: string): EmailAnalysisResponse {
		const spamWords = [
			"free",
			"urgent",
			"limited time",
			"act now",
			"click here",
			"buy now",
			"guaranteed",
			"no obligation",
			"risk free",
			"winner",
			"congratulations",
			"cash",
			"money",
			"earn",
			"income",
			"investment",
			"loan",
			"credit",
			"viagra",
			"casino",
			"lottery",
			"prize",
			"offer expires",
		];

		const contentLower = content.toLowerCase();
		let spamScore = 0;
		let deliverabilityScore = 90;
		let engagementScore = 70;

		const issues = [];
		const suggestions = [];
		const optimizations = [];

		// Spam word detection
		spamWords.forEach((word) => {
			if (contentLower.includes(word)) {
				spamScore += 8;
				deliverabilityScore -= 5;
				issues.push({
					type: "spam_risk" as const,
					severity: "medium" as const,
					message: `Contains spam trigger word: "${word}"`,
					suggestion: `Remove or replace "${word}" with more professional language`,
					impact: 8,
				});
			}
		});

		// Check for excessive capitalization
		const capsCount = (content.match(/[A-Z]/g) || []).length;
		const capsRatio = capsCount / content.length;
		if (capsRatio > 0.3) {
			spamScore += 15;
			deliverabilityScore -= 10;
			issues.push({
				type: "spam_risk" as const,
				severity: "high" as const,
				message: "Excessive capitalization detected",
				suggestion: "Use normal sentence case to avoid spam filters",
				impact: 15,
			});
		}

		// Check for multiple exclamation marks
		const exclamationCount = (content.match(/!/g) || []).length;
		if (exclamationCount > 2) {
			spamScore += 10;
			engagementScore -= 5;
			issues.push({
				type: "engagement" as const,
				severity: "low" as const,
				message: "Too many exclamation marks",
				suggestion:
					"Limit exclamation marks to maintain professionalism",
				impact: 5,
			});
		}

		// Personalization check
		if (
			!contentLower.includes("dear") &&
			!contentLower.includes("hi ") &&
			!contentLower.includes("hello")
		) {
			engagementScore -= 15;
			suggestions.push("Add a personal greeting to improve engagement");
			optimizations.push({
				type: "personalization" as const,
				suggestion: "Add personalized greeting with recipient name",
				expectedImprovement: 15,
			});
		}

		// Length optimization
		if (content.length < 50) {
			engagementScore -= 20;
			suggestions.push(
				"Email content is too short for meaningful engagement"
			);
		} else if (content.length > 1000) {
			engagementScore -= 10;
			suggestions.push("Consider making the email more concise");
		}

		// Normalize scores
		spamScore = Math.min(100, Math.max(0, spamScore));
		deliverabilityScore = Math.min(100, Math.max(0, deliverabilityScore));
		engagementScore = Math.min(100, Math.max(0, engagementScore));

		return {
			spamScore,
			deliverabilityScore,
			engagementScore,
			reputationImpact: Math.round(
				(deliverabilityScore + engagementScore) / 2
			),
			suggestions,
			issues,
			optimizations,
		};
	}

	private async logEmailGeneration(
		request: EmailGenerationRequest,
		response: EmailGenerationResponse
	): Promise<void> {
		try {
			const supabase = await createClient();
			await supabase.from("ai_generation_logs").insert([
				{
					type: request.type,
					context: request.context,
					constraints: request.constraints,
					generated_subject: response.subject,
					generated_body: response.body,
					confidence: response.confidence,
					tone: response.tone,
					created_at: new Date().toISOString(),
				},
			]);
		} catch (error) {
			console.warn("Failed to log AI generation:", error);
		}
	}

	async getConversationContext(
		emailId: string,
		recipientEmail: string
	): Promise<EmailContext["previousEmails"]> {
		const supabase = await createClient();
		try {
			const { data: logs, error } = await supabase
				.from("email_logs")
				.select("subject, metadata, sent_at, status")
				.eq("email_id", emailId)
				.eq("recipient", recipientEmail)
				.order("sent_at", { ascending: false })
				.limit(5);

			if (error || !logs) return [];

			return logs.map((log) => ({
				subject: log.subject,
				body: log.metadata?.body || "",
				timestamp: log.sent_at,
				direction: "sent" as const,
			}));
		} catch (error) {
			console.error("Error fetching conversation context:", error);
			return [];
		}
	}

	static isAvailable(): boolean {
		return !!process.env.GEMINI_API_KEY;
	}

	async getServiceHealth(): Promise<{
		available: boolean;
		model: string;
		version: string;
		responseTime: number;
	}> {
		const startTime = Date.now();
		try {
			const result = await this.model.generateContent("Test connection");
			await result.response;

			return {
				available: true,
				model: "gemini-1.5-flash",
				version: "1.0",
				responseTime: Date.now() - startTime,
			};
		} catch (error) {
			return {
				available: false,
				model: "gemini-1.5-flash",
				version: "1.0",
				responseTime: Date.now() - startTime,
			};
		}
	}
}

// Singleton instance
let aiServiceInstance: AdvancedAIService | null = null;

export function getAIService(): AdvancedAIService {
	if (!aiServiceInstance) {
		aiServiceInstance = new AdvancedAIService();
	}
	return aiServiceInstance;
}

// Enhanced email templates with better variety
export const ADVANCED_EMAIL_TEMPLATES = {
	introduction: [
		{
			subject: "Quick introduction from {{senderName}}",
			body: `Hi {{recipientName}},

I hope this email finds you well. I came across your work at {{recipientCompany}} and was impressed by your expertise in {{industry}}.

I'm {{senderName}} from {{senderCompany}}, and I'd love to connect with fellow professionals in our field.

Would you be open to a brief conversation sometime?

Best regards,
{{senderName}}`,
		},
		{
			subject: "Connecting with {{industry}} professionals",
			body: `Hello {{recipientName}},

I've been following some interesting developments in {{industry}} and noticed your contributions at {{recipientCompany}}.

I'm {{senderName}}, working in a similar space at {{senderCompany}}. I'd appreciate the opportunity to connect and perhaps share insights.

Looking forward to hearing from you.

Best,
{{senderName}}`,
		},
	],
	follow_up: [
		{
			subject: "Following up on our conversation",
			body: `Hi {{recipientName}},

I hope you're doing well. I wanted to follow up on our previous conversation about {{topic}}.

Have you had a chance to consider what we discussed? I'd be happy to provide any additional information you might need.

Best regards,
{{senderName}}`,
		},
	],
	networking: [
		{
			subject: "Expanding my {{industry}} network",
			body: `Hi {{recipientName}},

I'm actively expanding my professional network in {{industry}} and came across your profile.

Your experience at {{recipientCompany}} caught my attention, and I'd love to connect with like-minded professionals.

Would you be interested in connecting?

Best regards,
{{senderName}}`,
		},
	],
};
