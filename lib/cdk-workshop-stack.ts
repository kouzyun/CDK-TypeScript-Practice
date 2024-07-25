import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from 'aws-cdk-lib/aws-rds';

import { readFileSync } from "fs";

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "BlogVpc", {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      vpcName: 'BlogVpc'
    });

    // EC2 インスタンスの宣言を準備
    const webServer1 = new ec2.Instance(this, "WordpressServer1", {
      // EC2 インスタンスを起動する VPC を設定
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      // AmazonLinuxImage インスタンスを生成し、AMI を設定
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      // EC2 インスタンスを配置するサブネットを指定
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    const script = readFileSync("./lib/resources/user-data.sh", "utf8");
    // EC2 インスタンスにユーザーデータを追加
    webServer1.addUserData(script);


    // port80, 全ての IP アドレスからのアクセスを許可
    webServer1.connections.allowFromAnyIpv4(ec2.Port.tcp(80));
    
    // EC2 インスタンスアクセス用の IP アドレスを出力
    new CfnOutput(this, "WordpressServer1PublicIPAddress", {
      value: `http://${webServer1.instancePublicIp}`,
    });

    // DB
    const dbServer = new rds.DatabaseInstance(this, "WordPressDB", {
      vpc,
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_36 }),
      // RDS DB インスタンスのインスタンスタイプを設定
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      // RDS DB インスタンスのデータベース名を設定
      databaseName: "wordpress",
    });

    // WebServer からのアクセスを許可
    dbServer.connections.allowDefaultPortFrom(webServer1);
  }
}
