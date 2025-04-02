import { createHash } from 'node:crypto';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const plivoFwd = (phone, debugInfo = null) => {
    const resp = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<Response>"];

    // Add +1 prefix if it's missing
    let formattedPhone = phone;
    if (phone && !phone.startsWith('+1') && /^\d{10}$/.test(phone)) {
        formattedPhone = `+1${phone}`;
    }

    if (formattedPhone && /^\+1\d{10}$/.test(formattedPhone)) {
        // Forward call to the given phone number
        resp.push(`<Dial><Number>${formattedPhone}</Number></Dial>`);
    } else {
        // No valid phone number set. Speak error message to caller.
        resp.push(`<Speak>On-call phone is invalid. Please use on-call list</Speak>`);
    }

    if (debugInfo) {
        resp.push(`<!-- <Debug>${debugInfo}</Debug> -->`);
    }

    resp.push("</Response>");
    console.log("Plivo response:", resp.join(""));
    return new Response(resp.join(""), {
        status: 200,
        headers: { ...corsHeaders, "content-type": "text/xml" },
    });
};

async function validateAuth(hash, utc, env) {
    // Verify UTC is within 1 minute
    const currentUtc = Math.floor(Date.now() / 1000);
    if (Math.abs(currentUtc - parseInt(utc)) > 60) {
        return {
            valid: false,
            response: new Response('Not authorized: Time mismatch', {
                status: 401,
                headers: corsHeaders
            })
        };
    }

    // Get password from environment variables
    const password = env.password;
    if (!password) {
        return {
            valid: false,
            response: new Response('Server configuration error', {
                status: 500,
                headers: corsHeaders
            })
        };
    }

    // Create hash of utc|password
    const expectedHash = createHash('sha256')
        .update(`${utc}|${password}`)
        .digest('hex');

    // Compare hashes
    if (hash !== expectedHash) {
        return {
            valid: false,
            response: new Response('Not authorized: invalid password', {
                status: 401,
                headers: corsHeaders
            })
        };
    }

    return { valid: true };
}

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders
            });
        }

        const url = new URL(request.url);

        if (url.pathname === '/auth' && request.method === 'POST') {
            try {
                const { hash, utc } = await request.json();
                const authResult = await validateAuth(hash, utc, env);

                if (!authResult.valid) {
                    return authResult.response;
                }

                return new Response('Authorized', {
                    status: 200,
                    headers: corsHeaders
                });
            } catch (error) {
                return new Response('Invalid request format', {
                    status: 400,
                    headers: corsHeaders
                });
            }
        }

        if (url.pathname === '/update' && request.method === 'POST') {
            try {
                const { hash, utc, contacts, selected } = await request.json();
                const authResult = await validateAuth(hash, utc, env);

                if (!authResult.valid) {
                    return authResult.response;
                }

                // Get client IP from request
                const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

                // Get current R2 object
                const object = await env.R2_BUCKET.get('resphone.json');
                if (!object) {
                    return new Response('R2 object not found', {
                        status: 404,
                        headers: corsHeaders
                    });
                }

                const currentConfig = await object.json();

                // Update the configuration
                const updatedConfig = {
                    ...currentConfig,
                    contacts,
                    selected,
                    updates: [
                        ...currentConfig.updates,
                        {
                            ts: new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
                            update: `Updated to ${selected} from IP ${clientIP}`
                        }
                    ]
                };

                // Save back to R2
                await env.R2_BUCKET.put('resphone.json', JSON.stringify(updatedConfig));

                return new Response(JSON.stringify(updatedConfig), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders
                    }
                });
            } catch (error) {
                return new Response('Invalid request format', {
                    status: 400,
                    headers: corsHeaders
                });
            }
        }

        if (url.pathname === '/' && request.method === 'GET') {
            try {
                const { hash, utc } = await request.json();
                const authResult = await validateAuth(hash, utc, env);

                if (!authResult.valid) {
                    return authResult.response;
                }

                // Get R2 object
                const object = await env.R2_BUCKET.get('resphone.json');
                if (!object) {
                    return new Response('R2 object not found', {
                        status: 404,
                        headers: corsHeaders
                    });
                }

                // Return the object contents
                return new Response(object.body, {
                    headers: {
                        'content-type': 'text/html',
                        ...corsHeaders
                    }
                });
            } catch (error) {
                return new Response('Invalid request format', {
                    status: 400,
                    headers: corsHeaders
                });
            }
        }

        if (url.pathname === '/plivo' && request.method === 'GET') {
            try {
                // Get R2 object
                const object = await env.R2_BUCKET.get('resphone.json');
                if (!object) {
                    return new Response('R2 object not found', {
                        status: 404,
                        headers: corsHeaders
                    });
                }

                const config = await object.json();
                const selectedNumber = config.selected;

                // Get debug info from request
                const debugInfo = request.headers.get('X-Plivo-Debug') || null;

                return plivoFwd(selectedNumber, debugInfo);
            } catch (error) {
                console.error('Error in Plivo handler:', error);
                return new Response('Internal server error', {
                    status: 500,
                    headers: corsHeaders
                });
            }
        }

        return new Response('<div>hello</div>', {
            headers: {
                'content-type': 'text/html',
                ...corsHeaders
            },
        });
    },
}; 