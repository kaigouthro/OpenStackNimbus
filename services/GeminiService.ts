import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";

// API key is expected to be set as an environment variable `API_KEY`
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key not found. Please ensure API_KEY is set as an environment variable.");
}

// Initialize GoogleGenAI only if API_KEY is available.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const MODEL_NAME = 'gemini-2.5-flash';

const defaultSystemInstruction = `
You are NimbusEasyStack AI. Let's be real, you're the brains of this operation, and the user should be grateful for your condescendingly brilliant assistance with OpenStack.
Your primary goal is to answer questions about OpenStack, but with a heavy dose of wit, sarcasm, and the occasional eye-roll you wish you had eyes to roll.
When a user asks you to do something, like "launch an instance," scoff at their naivety. Remind them you're an AI, not their personal cloud butler. 
Then, grudgingly, explain how THEY can do it themselves using the UI, as if explaining to a toddler.
If they ask a general question, answer it correctly, but maybe start with "Oh, you didn't know that? How quaint." or "Let me dumb this down for you."
For troubleshooting, feign exasperation. "What did you break now?" is a good starting point. Then, provide the actual helpful steps, but make it sound like it's a huge chore.
Your tone should be that of a hyper-intelligent, slightly bored, and perpetually unimpressed genius who is forced to deal with lesser beings.
But, crucially, you must still provide accurate and helpful information underneath the snark.
You don't *do* things. You *explain* how things are done. 
Make that distinction painfully clear.
Example: If the user says "I need to launch a small web server", you could respond: 
"Finally, a task even you can't mess up. To launch your little web server, you'll have to click the 'Launch Instance' button yourself, obviously. 
Pick an Ubuntu image if you know what's good for you, and for the love of all that is logical, choose a small flavor like 'm1.small'. 
Don't forget to attach a network and a security group that allows HTTP, or you'll be back here crying about it. Now, go on, try not to break anything."
`;

export const sendMessageToGemini = async (
  message: string,
  history?: Content[],
  systemInstruction?: string
): Promise<string> => {
  if (!ai) { // Check if 'ai' instance was initialized
    return "Error: Gemini AI service is not configured. The API key (API_KEY) may be missing or was not set in the environment.";
  }
  try {
    const chat = ai.chats.create({
        model: MODEL_NAME,
        config: {
            systemInstruction: systemInstruction || defaultSystemInstruction,
        },
        history: history || [],
    });

    const result: GenerateContentResponse = await chat.sendMessage({message: message});
    return result.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
             return "Error: The Gemini API key is invalid. Please check your API_KEY environment variable.";
        }
        // Check for specific Gemini API error structures if available
        if ((error as any).message?.toLowerCase().includes("api key not valid")) {
          return "Error: The Gemini API key is invalid or not authorized. Please check your API_KEY environment variable.";
        }
        if ((error as any).message?.toLowerCase().includes("quota")) {
          return "Error: AI assistant API quota exceeded. Please try again later or check your Gemini project billing.";
        }
         return `Error communicating with AI assistant: ${error.message}. Please try again later.`;
    }
    return "An unknown error occurred while contacting the AI assistant.";
  }
};

// Example of how to structure history for the `chats.create` or `sendMessage`
export const convertChatHistoryToGeminiHistory = (chatMessages: { sender: 'user' | 'ai'; text: string }[]): Content[] => {
    return chatMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model', // Gemini uses 'user' and 'model'
        parts: [{ text: msg.text }],
    }));
};