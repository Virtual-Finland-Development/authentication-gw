import { setupAWSMock } from "./__mocks__/mockAWSSKD";

setupAWSMock();
process.env.DYNAMODB_CACHE_TABLE_NAME = "test";
