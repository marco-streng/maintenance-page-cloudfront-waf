import {
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_s3,
  aws_s3_deployment,
  custom_resources,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { resolve } from "node:path";

interface AppStackProps extends StackProps {
  webAclArnParameterName: string;
}

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // S3 Bucket
    const clientBucket = new aws_s3.Bucket(this, "ClientBucket", {
      accessControl: aws_s3.BucketAccessControl.PRIVATE,
    });
    new aws_s3_deployment.BucketDeployment(this, "clientDeployment", {
      destinationBucket: clientBucket,
      sources: [
        aws_s3_deployment.Source.asset(resolve(__dirname, "html", "app")),
      ],
    });

    // Fetch ARN for webACL from ParameterStore in us-east-1
    const webACLArnParameter = new custom_resources.AwsCustomResource(
      this,
      "WebACLArnParameter",
      {
        onUpdate: {
          service: "SSM",
          action: "GetParameter",
          parameters: {
            Name: props.webAclArnParameterName,
          },
          region: "us-east-1",
          physicalResourceId: custom_resources.PhysicalResourceId.of(
            Date.now().toString()
          ),
        },
        policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
          resources: custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      }
    );

    // Create CloudFront Distribution
    new aws_cloudfront.Distribution(this, "Distribution", {
      webAclId: webACLArnParameter.getResponseField("Parameter.Value"),
      defaultBehavior: {
        origin:
          aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
            clientBucket
          ),
      },
      defaultRootObject: "index.html",
    });
  }
}
