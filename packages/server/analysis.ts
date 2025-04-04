import config from "./config";
import OpenAI from "openai";

interface Event {
  timestamp: number;
  type: string;
  target: {
    tag: string;
    id: string;
    classes: string[];
    position: {
      x: number;
      y: number;
    };
  };
}

interface ConsoleLog {
  level: string;
  message: string;
  timestamp: number;
}

interface AnalysisContext {
  events: Event[];
  consoleLogs: ConsoleLog[];
  screenshotPath?: string;
  sessionId: string;
}

interface AnalysisResult {
  userActivity: string;
  potentialIssues: string[];
  uxSuggestions: string[];
  confidence: number; // 0-1
}

// Mock analysis rules
const analyzeEvents = (events: Event[]): Partial<AnalysisResult> => {
  const result: Partial<AnalysisResult> = {
    potentialIssues: [],
    uxSuggestions: [],
  };

  // Analyze click patterns
  const clicks = events.filter((e) => e.type === "click");
  const rapidClicks = clicks.filter((click, i) => {
    if (i === 0) return false;
    return click.timestamp - clicks[i - 1].timestamp < 500; // Less than 500ms between clicks
  });

  if (rapidClicks.length > 3) {
    result.potentialIssues?.push(
      "User appears to be clicking rapidly, possibly indicating confusion or frustration"
    );
    result.uxSuggestions?.push(
      "Consider adding loading states or feedback for clickable elements"
    );
  }

  // Analyze scroll behavior
  const scrolls = events.filter((e) => e.type === "scroll");
  if (scrolls.length > 10) {
    result.potentialIssues?.push(
      "User is scrolling extensively, content might be hard to find"
    );
    result.uxSuggestions?.push(
      "Consider improving content organization or adding a search feature"
    );
  }

  // Analyze input behavior
  const inputs = events.filter((e) => e.type === "input");
  const deletedInputs = inputs.filter((input, i) => {
    if (i === 0) return false;
    return input.timestamp - inputs[i - 1].timestamp < 1000; // Input followed by another input within 1s
  });

  if (deletedInputs.length > 0) {
    result.potentialIssues?.push(
      "User is frequently correcting input, form might be unclear"
    );
    result.uxSuggestions?.push(
      "Consider adding input validation or clearer field labels"
    );
  }

  return result;
};

const analyzeConsoleLogs = (logs: ConsoleLog[]): Partial<AnalysisResult> => {
  const result: Partial<AnalysisResult> = {
    potentialIssues: [],
    uxSuggestions: [],
  };

  const errors = logs.filter((log) => log.level === "ERROR");
  const warnings = logs.filter((log) => log.level === "WARN");

  if (errors.length > 0) {
    result.potentialIssues?.push(
      `Found ${errors.length} JavaScript errors that might affect functionality`
    );
    result.uxSuggestions?.push(
      "Review and fix JavaScript errors to improve stability"
    );
  }

  if (warnings.length > 0) {
    result.potentialIssues?.push(
      `Found ${warnings.length} warnings that might indicate suboptimal behavior`
    );
    result.uxSuggestions?.push(
      "Address console warnings to improve code quality"
    );
  }

  return result;
};

const generateUserActivitySummary = (events: Event[]): string => {
  const clickCount = events.filter((e) => e.type === "click").length;
  const scrollCount = events.filter((e) => e.type === "scroll").length;
  const inputCount = events.filter((e) => e.type === "input").length;

  return `User was active for ${events.length} events: ${clickCount} clicks, ${scrollCount} scrolls, ${inputCount} inputs`;
};

async function callAI(context: AnalysisContext): Promise<AnalysisResult> {
  if (!config.openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey,
  });

  const prompt = `Analyze this user session for UX issues. Here's the context:

Events:
${JSON.stringify(context.events, null, 2)}

Console Logs:
${JSON.stringify(context.consoleLogs, null, 2)}

${
  context.screenshotPath
    ? `Screenshot available at: ${context.screenshotPath}`
    : ""
}

Please analyze this data and provide:
1. A brief summary of what the user was trying to do
2. Any potential UX issues you notice
3. Specific suggestions for improvement

Format your response as:
Summary: [your summary]
Issues:
- [issue 1]
- [issue 2]
...
Suggestions:
- [suggestion 1]
- [suggestion 2]
...`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content:
          "You are a UX expert analyzing user behavior. Provide clear, actionable insights about potential issues and specific suggestions for improvement. Focus on user experience, accessibility, and performance.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content || "";

  // Parse the structured response
  const summaryMatch = content.match(/Summary: (.*?)(?:\n|$)/);
  const issuesMatch = content.match(/Issues:\n([\s\S]*?)(?:\nSuggestions:|$)/);
  const suggestionsMatch = content.match(/Suggestions:\n([\s\S]*?)$/);

  return {
    userActivity: summaryMatch
      ? summaryMatch[1].trim()
      : "Unable to generate summary",
    potentialIssues: issuesMatch
      ? issuesMatch[1]
          .split("\n")
          .filter((line: string) => line.trim().startsWith("-"))
          .map((line: string) => line.trim().substring(1).trim())
      : [],
    uxSuggestions: suggestionsMatch
      ? suggestionsMatch[1]
          .split("\n")
          .filter((line: string) => line.trim().startsWith("-"))
          .map((line: string) => line.trim().substring(1).trim())
      : [],
    confidence: 0.8,
  };
}

export async function analyzeSessionContext(
  context: AnalysisContext
): Promise<AnalysisResult> {
  // Mock analysis combining different aspects
  const eventAnalysis = analyzeEvents(context.events);
  const consoleAnalysis = analyzeConsoleLogs(context.consoleLogs);

  try {
    // Try to get AI analysis if API key is available
    const aiAnalysis = await callAI(context);

    // Combine results
    return {
      userActivity: aiAnalysis.userActivity,
      potentialIssues: [
        ...(eventAnalysis.potentialIssues || []),
        ...(consoleAnalysis.potentialIssues || []),
        ...aiAnalysis.potentialIssues,
      ],
      uxSuggestions: [
        ...(eventAnalysis.uxSuggestions || []),
        ...(consoleAnalysis.uxSuggestions || []),
        ...aiAnalysis.uxSuggestions,
      ],
      confidence: aiAnalysis.confidence,
    };
  } catch (error) {
    // Fall back to rule-based analysis if AI fails
    return {
      userActivity: generateUserActivitySummary(context.events),
      potentialIssues: [
        ...(eventAnalysis.potentialIssues || []),
        ...(consoleAnalysis.potentialIssues || []),
      ],
      uxSuggestions: [
        ...(eventAnalysis.uxSuggestions || []),
        ...(consoleAnalysis.uxSuggestions || []),
      ],
      confidence: 0.7,
    };
  }
}
