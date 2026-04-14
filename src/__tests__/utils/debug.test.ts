import { debugLog } from "../../utils/debug";

describe("debugLog", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("logs with prefix when debug is true", () => {
    debugLog(true, "test message");
    expect(consoleSpy).toHaveBeenCalledWith("[DOMTracker]", "test message");
  });

  it("does not log when debug is false", () => {
    debugLog(false, "test message");
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("passes multiple arguments", () => {
    debugLog(true, "msg", 42, { key: "value" });
    expect(consoleSpy).toHaveBeenCalledWith("[DOMTracker]", "msg", 42, {
      key: "value",
    });
  });
});
