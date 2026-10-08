import assert from "node:assert/strict";
import test from "node:test";
import { prepareSeedanceAsset } from "../src/seedance-asset.js";

test("BytePlus Ark review polls a pending Seedance image until it becomes active", async () => {
  const actions: string[] = [];
  const result = await prepareSeedanceAsset({
    sourceUrl: "https://media.test/person.png", groupId: "group-test", projectName: "hypit",
    accessKeyId: "access-key", accessKeySecret: "access-secret", pollIntervalMs: 0,
    fetch: async (input, init) => {
      const action = new URL(String(input)).searchParams.get("Action")!; actions.push(action);
      const body = JSON.parse(String(init?.body));
      if (action === "CreateAsset") {
        assert.deepEqual(body, { GroupId: "group-test", URL: "https://media.test/person.png", AssetType: "Image", ProjectName: "hypit" });
        return Response.json({ Result: { Id: "asset-1", Status: "Pending" } });
      }
      assert.deepEqual(body, { Id: "asset-1", ProjectName: "hypit" });
      return Response.json({ Result: { Id: "asset-1", Status: "Active" } });
    },
  });
  assert.equal(result, "asset://asset-1");
  assert.deepEqual(actions, ["CreateAsset", "GetAsset"]);
});
