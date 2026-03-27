// ML Service for Smart Quiz Generation
class MLQuizService {
    constructor() {
        this.apiKey = 'AIzaSyA_oj89BXNQ2WZwYB1TO4ogMcazYWRQ9P8'; // You'll need to add your OpenAI API key
        this.baseURL = 'https://api.openai.com/v1/chat/completions';
    }

    // Set API key (users can add their own)
    setApiKey(key) {
        this.apiKey = key;
    }

    // Generate quiz using OpenAI GPT
    async generateQuizFromTranscript(transcript, questionCount = 5) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        if (!transcript || transcript.length < 100) {
            throw new Error('Transcript too short or empty');
        }

        const prompt = this.createQuizPrompt(transcript, questionCount);
        
        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert educational AI that creates high-quality multiple choice questions from educational content. Always return valid JSON."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parseQuizResponse(data.choices[0].message.content);
            
        } catch (error) {
            console.error('ML Quiz Generation Error:', error);
            throw error;
        }
    }

    createQuizPrompt(transcript, questionCount) {
        return `
        Create ${questionCount} high-quality multiple choice questions based on the following video transcript.
        
        TRANSCRIPT:
        ${transcript.substring(0, 4000)} // Limit transcript length
        
        REQUIREMENTS:
        1. Create ${questionCount} diverse questions testing different aspects
        2. Each question should have 4 options (A, B, C, D)
        3. Mark the correct answer clearly
        4. Include brief explanations
        5. Questions should test comprehension, not just recall
        6. Make questions challenging but fair
        
        RESPONSE FORMAT (JSON):
        {
            "questions": [
                {
                    "id": 1,
                    "question": "Clear question text",
                    "options": {
                        "A": "Option A",
                        "B": "Option B", 
                        "C": "Option C",
                        "D": "Option D"
                    },
                    "correctAnswer": "A",
                    "explanation": "Brief explanation of why this is correct"
                }
            ]
        }
        
        Return ONLY the JSON, no additional text.
        `;
    }

    parseQuizResponse(response) {
        try {
            // Clean the response
            const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
            const quizData = JSON.parse(cleanResponse);
            
            // Validate structure
            if (!quizData.questions || !Array.isArray(quizData.questions)) {
                throw new Error('Invalid response format');
            }
            
            return quizData;
        } catch (error) {
            console.error('Quiz parsing error:', error);
            throw new Error('Failed to parse quiz questions');
        }
    }

    // Fallback: Simple rule-based quiz generation if ML fails
    generateFallbackQuiz(transcript, questionCount = 5) {
        const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const questions = [];
        
        for (let i = 0; i < Math.min(questionCount, sentences.length); i++) {
            const sentence = sentences[i].trim();
            const words = sentence.split(' ').filter(word => word.length > 3);
            
            if (words.length < 5) continue;
            
            // Create comprehension questions
            const question = this.generateComprehensionQuestion(sentence, words);
            if (question) {
                questions.push(question);
            }
        }
        
        return { questions: questions.slice(0, questionCount) };
    }

    generateComprehensionQuestion(sentence, words) {
        const questionTypes = [
            () => this.createMainIdeaQuestion(sentence),
            () => this.createDetailQuestion(sentence, words),
            () => this.createInferenceQuestion(sentence)
        ];
        
        const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        return randomType();
    }

    createMainIdeaQuestion(sentence) {
        const options = [
            "The main topic being discussed",
            "A specific detail mentioned",
            "An unrelated concept", 
            "A hypothetical scenario"
        ];
        
        return {
            id: Date.now() + Math.random(),
            question: `What is the main idea of this statement: "${sentence.substring(0, 100)}..."?`,
            options: {
                A: options[0],
                B: options[1],
                C: options[2],
                D: options[3]
            },
            correctAnswer: "A",
            explanation: "This question tests understanding of the main concept rather than specific details."
        };
    }

    createDetailQuestion(sentence, words) {
        const keyWord = words[Math.floor(words.length / 2)];
        const options = this.generatePlausibleOptions(keyWord, words);
        
        return {
            id: Date.now() + Math.random(),
            question: `According to the content, what is "${keyWord}" referring to?`,
            options: {
                A: options[0],
                B: options[1],
                C: options[2],
                D: options[3]
            },
            correctAnswer: "A",
            explanation: "This tests attention to specific details in the content."
        };
    }

    createInferenceQuestion(sentence) {
        const options = [
            "You can infer this from the context",
            "This is directly stated",
            "This contradicts the statement",
            "This is completely unrelated"
        ];
        
        return {
            id: Date.now() + Math.random(),
            question: `Based on this statement, what can you infer: "${sentence.substring(0, 80)}..."?`,
            options: {
                A: options[0],
                B: options[1],
                C: options[2],
                D: options[3]
            },
            correctAnswer: "A",
            explanation: "This tests your ability to draw logical conclusions from the information."
        };
    }

    generatePlausibleOptions(correct, contextWords) {
        const options = [correct];
        const similarWords = contextWords.filter(word => 
            word !== correct && 
            word.length > 3 &&
            Math.random() > 0.7
        ).slice(0, 3);
        
        // Add some common educational terms as fallback
        const commonTerms = ['concept', 'method', 'process', 'theory', 'principle'];
        while (options.length < 4) {
            const randomTerm = commonTerms[Math.floor(Math.random() * commonTerms.length)];
            if (!options.includes(randomTerm)) {
                options.push(randomTerm);
            }
        }
        
        return this.shuffleArray(options);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}