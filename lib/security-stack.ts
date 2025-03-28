import * as cdk from "aws-cdk-lib";
import { aws_wafv2, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export class SecurityStack extends Stack {
  public readonly webAclArnParameterName = `/SecurityStack-webACL-arn`;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, {
      ...props,

      env: {
        region: "us-east-1",
      },
    });

    const { MAINTENANCE_MODE } = process.env;

    const maintenancePageHtmlContent = readFileSync(
      resolve(__dirname, "html", "maintenance.html"),
      "utf8"
    );

    const webACL = new aws_wafv2.CfnWebACL(this, "WebACL", {
      scope: "CLOUDFRONT",
      defaultAction: {
        ...(MAINTENANCE_MODE === "true"
          ? {
              block: {
                customResponse: {
                  responseCode: 200,
                  customResponseBodyKey: "maintenance",
                },
              },
            }
          : {
              allow: {},
            }),
      },
      customResponseBodies: {
        maintenance: {
          content: maintenancePageHtmlContent,
          contentType: "TEXT_HTML",
        },
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: false,
        sampledRequestsEnabled: false,
        metricName: "WafMetric",
      },
    });

    // Write ARN of webACL in ParameterStore to make it available for Stacks in other regions
    new cdk.aws_ssm.StringParameter(this, "WebACLParameter", {
      parameterName: this.webAclArnParameterName,
      stringValue: webACL.attrArn,
    });
  }
}
