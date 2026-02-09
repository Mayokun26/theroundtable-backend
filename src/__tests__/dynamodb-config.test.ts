describe('dynamodb config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('uses default table names when env is not provided', async () => {
    delete process.env.PROJECT_NAME;
    delete process.env.ENVIRONMENT;

    const sendMock = jest.fn().mockResolvedValue({});

    jest.doMock('@aws-sdk/client-dynamodb', () => ({
      DynamoDBClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
      DescribeTableCommand: jest.fn().mockImplementation((args) => args),
    }));

    jest.doMock('@aws-sdk/lib-dynamodb', () => ({
      DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({}),
      },
    }));

    const module = await import('../config/dynamodb');

    expect(module.TableNames.USERS).toContain('theroundtable-users-dev');
    expect(module.TableNames.CONVERSATIONS).toContain('theroundtable-conversations-dev');
    expect(module.TableNames.MESSAGES).toContain('theroundtable-messages-dev');
  });

  it('returns true when DescribeTable succeeds', async () => {
    const sendMock = jest.fn().mockResolvedValue({});

    jest.doMock('@aws-sdk/client-dynamodb', () => ({
      DynamoDBClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
      DescribeTableCommand: jest.fn().mockImplementation((args) => args),
    }));

    jest.doMock('@aws-sdk/lib-dynamodb', () => ({
      DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({}),
      },
    }));

    const module = await import('../config/dynamodb');
    const ok = await module.checkDynamoDBConnection();

    expect(ok).toBe(true);
    expect(sendMock).toHaveBeenCalled();
  });

  it('returns false when DescribeTable fails', async () => {
    const sendMock = jest.fn().mockRejectedValue(new Error('dynamo fail'));

    jest.doMock('@aws-sdk/client-dynamodb', () => ({
      DynamoDBClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
      DescribeTableCommand: jest.fn().mockImplementation((args) => args),
    }));

    jest.doMock('@aws-sdk/lib-dynamodb', () => ({
      DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({}),
      },
    }));

    const module = await import('../config/dynamodb');
    const ok = await module.checkDynamoDBConnection();

    expect(ok).toBe(false);
  });
});
