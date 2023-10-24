import 'dotenv/config'
import { openai } from './openai.mjs'
import math from 'advanced-calculator'

const QUESTION = process.argv[2] || 'hi'

const messages = [
    {
        role: 'user',
        content: QUESTION,
    },
]

const functions = {
    calculate: ({ expression }) => math.evaluate(expression),
    generateImg: async ({prompt}) => {
        const result = await openai.images.generate({ prompt })
        console.log(result)
        return result.data[0].url
    }
}

const getCompletion = (message) => {
    return openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0613',
        messages,
        temperature: 0,
        functions: [
            {
                name: 'calculate',
                description: 'Run a math expression',
                parameters: {
                    type: 'object',
                    properties: {
                        expression: {
                            type: 'string',
                            description: 'The math expression like "2 * 3 A (21/2) ^2"',
                        },
                    },
                    required: ['expression'],
                }
            },
            {
                name: 'generateImg',
                description: 'create or generate a image based on description',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: {
                            type: 'string',
                            description: 'Description to generate',
                        },
                    },
                    required: ['prompt'],
                }
            }
        ]
    })
}

let response;
while(true){
    response = await getCompletion(messages)
    if(response.choices[0].finish_reason === 'stop'){
        console.log(response.choices[0].message.content)
        break
    }else if (response.choices[0].finish_reason === 'function_call'){
        const fnName = response.choices[0].message.function_call.name
        const args = response.choices[0].message.function_call.arguments

        const functionToCall = functions[fnName]
        const params = JSON.parse(args)

        const result = functionToCall(params)

        messages.push({
            role: 'assistant',
            content: null,
            function_call: {
                name: fnName,
                arguments: args
            }
        })

        messages.push({
            role: 'function',
            name: fnName,
            content: JSON.stringify({result})
        })
    }
}