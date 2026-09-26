import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from the .env file
load_dotenv()

account_identifier = os.getenv("SNOWFLAKE_ACCOUNT_IDENTIFIER")
pat_token = os.getenv("SNOWFLAKE_PAT")
model_name = os.getenv("SNOWFLAKE_MODEL", "mistral-large2")

# Validate configuration
if not account_identifier or not pat_token:
    raise ValueError("Missing credentials! Please check your .env file for SNOWFLAKE_ACCOUNT_IDENTIFIER and SNOWFLAKE_PAT.")

# Initialize the OpenAI client pointing to the Snowflake Cortex REST endpoint
client = OpenAI(
    api_key=pat_token,
    base_url=f"https://{account_identifier}.snowflakecomputing.com/api/v2/cortex/v1"
)

def query_cortex(prompt: str):
    """Sends a chat completion request to Snowflake Cortex AI."""
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant running inside Snowflake."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"An error occurred while communicating with Snowflake Cortex: {e}"

if __name__ == "__main__":
    user_prompt = "Explain the benefits of running LLMs directly inside a data warehouse in 3 bullet points."
    
    print(f"Connecting to Snowflake Cortex (Account: {account_identifier}) using model: {model_name}...\n")
    result = query_cortex(user_prompt)
    
    print("--- Cortex Response ---")
    print(result)