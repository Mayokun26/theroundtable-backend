describe('startup flow', () => {
  const originalEnv = { ...process.env };
  const originalExit = process.exit;

  afterEach(() => {
    process.env = { ...originalEnv };
    process.exit = originalExit;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('exits when dynamodb connection fails', async () => {
    const exitMock = jest.fn() as unknown as typeof process.exit;
    process.exit = exitMock;

    const listenMock = jest.fn();

    jest.doMock('../server', () => ({
      createServer: () => ({ listen: listenMock }),
    }));

    jest.doMock('../config/dynamodb', () => ({
      checkDynamoDBConnection: jest.fn().mockResolvedValue(false),
    }));

    jest.doMock('../config/redis', () => ({
      createRedisClient: jest.fn().mockResolvedValue(null),
      isRedisEnabled: jest.fn().mockReturnValue(false),
    }));

    const module = await import('../index');
    await module.startServer();

    expect(exitMock).toHaveBeenCalledWith(1);
    expect(listenMock).not.toHaveBeenCalled();
  });

  it('starts server even if redis init throws', async () => {
    const exitMock = jest.fn() as unknown as typeof process.exit;
    process.exit = exitMock;

    const listenMock = jest.fn((_: number, cb: () => void) => cb());

    jest.doMock('../server', () => ({
      createServer: () => ({ listen: listenMock }),
    }));

    jest.doMock('../config/dynamodb', () => ({
      checkDynamoDBConnection: jest.fn().mockResolvedValue(true),
    }));

    jest.doMock('../config/redis', () => ({
      createRedisClient: jest.fn().mockRejectedValue(new Error('redis down')),
      isRedisEnabled: jest.fn().mockReturnValue(false),
    }));

    const module = await import('../index');
    await module.startServer();

    expect(listenMock).toHaveBeenCalled();
    expect(exitMock).not.toHaveBeenCalled();
  });
});
