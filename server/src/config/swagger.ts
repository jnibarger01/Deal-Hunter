export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Deal Hunter API',
    version: '1.0.0',
    description: 'The Bloomberg Terminal for flippers - API for discovering and analyzing marketplace deals',
    contact: {
      name: 'API Support',
      email: 'support@dealhunter.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server',
    },
    {
      url: 'https://api.dealhunter.com',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication endpoints' },
    { name: 'Deals', description: 'Deal management endpoints' },
    { name: 'Watchlist', description: 'User watchlist operations' },
    { name: 'Portfolio', description: 'Portfolio tracking' },
    { name: 'Alerts', description: 'Alert management' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin'] },
          isActive: { type: 'boolean' },
          emailVerified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Deal: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          marketValue: { type: 'number' },
          estimatedProfit: { type: 'number' },
          dealScore: { type: 'number' },
          roi: { type: 'number' },
          category: { type: 'string' },
          condition: { type: 'string' },
          imageUrl: { type: 'string' },
          itemUrl: { type: 'string' },
          location: { type: 'string' },
          marketplace: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        tokens: {
                          type: 'object',
                          properties: {
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/schemas/Error' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
          },
          401: { $ref: '#/components/schemas/Error' },
        },
      },
    },
    '/api/v1/deals': {
      get: {
        tags: ['Deals'],
        summary: 'Get all deals',
        parameters: [
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'marketplace',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          200: {
            description: 'List of deals',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        deals: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Deal' },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                            totalPages: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/watchlist': {
      get: {
        tags: ['Watchlist'],
        summary: 'Get user watchlist',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User watchlist items' },
          401: { $ref: '#/components/schemas/Error' },
        },
      },
      post: {
        tags: ['Watchlist'],
        summary: 'Add deal to watchlist',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dealId'],
                properties: {
                  dealId: { type: 'string', format: 'uuid' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Deal added to watchlist' },
          400: { $ref: '#/components/schemas/Error' },
          401: { $ref: '#/components/schemas/Error' },
        },
      },
    },
  },
};
