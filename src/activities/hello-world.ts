import { Context } from '@temporalio/activity';
export async function getWeather(input: {
    location: string;
  }): Promise<{ city: string; temperatureRange: string; conditions: string }> {
    const activityInfo = Context.current().info;
    const attempt = activityInfo.attempt;
    
    console.log(`Activity execution - Attempt #${attempt} for ${input.location}`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulate network failure on first 2 attempts
    if (attempt < 3) {
      console.log(`❌ Simulating network failure on attempt ${attempt}...`);
      throw new Error('Network timeout: Unable to reach weather service');
    }
    
    console.log('✅ Successfully retrieved weather data!');
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
  