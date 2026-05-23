const vm = require("vm");

const executeJS = (code, input, timeoutMs = 3000) => {
  const logs = [];
  const sandbox = {
    console: {
      log: (...args) => {
        logs.push(
          args
            .map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)))
            .join(" ")
        );
      },
      error: (...args) => {
        logs.push(args.join(" "));
      },
    },
    require: (moduleName) => {
      if (moduleName === "fs") {
        return {
          readFileSync: (fd) => {
            if (fd === 0 || fd === "/dev/stdin") {
              return input;
            }
            throw new Error("Only standard input (FD 0) reading is permitted");
          },
        };
      }
      throw new Error(`Module ${moduleName} is not permitted in the sandbox`);
    },
    process: {
      stdout: {
        write: (data) => {
          logs.push(String(data));
        },
      },
      exit: () => {
        throw new Error("process.exit() is disabled in the sandbox");
      },
    },
  };

  try {
    const script = new vm.Script(code);
    const context = vm.createContext(sandbox);
    const startTime = Date.now();
    script.runInContext(context, { timeout: timeoutMs });
    const executionTime = Date.now() - startTime;
    const output = logs.join("\n").trim();
    return {
      success: true,
      output,
      executionTime,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      output: logs.join("\n").trim(),
      executionTime: 0,
      error: err.message,
    };
  }
};

module.exports = {
  executeJS,
};
