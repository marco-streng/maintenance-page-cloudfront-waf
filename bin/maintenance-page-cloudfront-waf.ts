#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AppStack } from "../lib/app-stack";
import { SecurityStack } from "../lib/security-stack";

const app = new cdk.App();

const securityStack = new SecurityStack(app, "SecurityStack");
const appStack = new AppStack(app, "AppStack", {
  webAclArnParameterName: securityStack.webAclArnParameterName,
});
