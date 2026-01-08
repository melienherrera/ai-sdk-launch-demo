import { generateText , tool, stepCountIs} from 'ai';
import { openai } from '@ai-sdk/openai';
import z from 'zod';

export async function getWeather(input: {
  location: string;
}): Promise<{ city: string; temperatureRange: string; conditions: string }> {
  return {
    city: input.location,
    temperatureRange: '14-20C',
    conditions: 'Sunny with wind.',
  };
}

export async function calculateAreaOfCircle(input: {
  radius: number;
}): Promise<{ area: number }> {
  return { area: Math.PI * input.radius * input.radius };
}
export async function haikuAgent(prompt: string): Promise<string> {
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt,
    system: 'You only respond in haikus.',
  });
  return result.text;
}

export async function toolsAgent(question: string): Promise<string> {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: question,
      system: 'You are a helpful agent.',
      tools: {
        getWeather: tool({
          description: 'Get the weather for a given city',
          inputSchema: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          execute: getWeather,
        }),
        calculateAreaOfCircle: tool({
          description: 'Calculate the area of a circle',
          inputSchema: z.object({
            radius: z.number().describe('The radius of the circle'),
          }),
          execute: calculateAreaOfCircle,
        }),
      },
      stopWhen: stepCountIs(5),
    });
    return result.text;
  }

async function main() {
  const option = process.argv[2] || 'haiku';
  const user_prompt = process.argv[3] || 'Tell me about recursion';

  let handle;
  switch (option) {
    case 'haiku':
      console.log("Generating haiku...");
      console.log("--------------------------------");
      handle = await haikuAgent(user_prompt);
      break;
    case 'agent':
      handle = await toolsAgent(user_prompt);
      break;
    default:
      throw new Error('Unknown option type: ' + option);
  }
  
  console.log(handle);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});