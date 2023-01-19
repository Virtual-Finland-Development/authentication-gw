import { jest } from "@jest/globals";

export function setupAWSMock() {
  jest.mock("aws-sdk", () => {
    jest.requireActual("aws-sdk");

    const mDocumentClientInstance = {
      query: jest.fn().mockReturnThis(),
      scan: jest.fn().mockReturnThis(),
      put: jest.fn().mockReturnThis(),
      promise: jest.fn(() => {
        return { Items: [] };
      }),
    };

    const mockDynamoDB = {
      DocumentClient: jest.fn(() => mDocumentClientInstance),
    };

    const mockSecretsManager = {
      getSecretValue: jest.fn(),
    };

    const mockSSM = jest.fn(() => {});

    return { DynamoDB: mockDynamoDB, SecretsManager: mockSecretsManager, SSM: mockSSM };
  });
}
