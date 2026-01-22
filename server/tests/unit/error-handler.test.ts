import { AppError, errorHandler } from '../../src/middleware/errorHandler';

const createRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('errorHandler', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('returns AppError details with stack in development', () => {
    process.env.NODE_ENV = 'development';
    const err = new AppError('Bad request', 400);
    const req: any = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
    const res = createRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Bad request',
          stack: expect.any(String),
        }),
      })
    );
  });

  it('returns generic error without stack in production', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('Boom');
    const req: any = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
    const res = createRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { message: 'Internal server error' },
      })
    );
  });

  it('omits stack for AppError in production', () => {
    process.env.NODE_ENV = 'production';
    const err = new AppError('Forbidden', 403);
    const req: any = { originalUrl: '/test', method: 'GET', ip: '127.0.0.1' };
    const res = createRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { message: 'Forbidden' },
      })
    );
  });
});
