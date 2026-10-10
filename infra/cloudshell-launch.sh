#!/usr/bin/env bash
# Launch Niyam inside the neatHack AWS account, from AWS CloudShell (browser terminal).
# Paste into CloudShell:
#   curl -fsSL https://raw.githubusercontent.com/usv240/niyam/main/infra/cloudshell-launch.sh | bash
# It follows the event rules: us-east-1, the supplied Hackathon_VPC, one t3.small,
# 20 GB gp3. It refuses to run if Hackathon_VPC is missing or an instance already runs.
set -euo pipefail
export AWS_DEFAULT_REGION=us-east-1
NAME=niyam

VPC=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=Hackathon_VPC" --query "Vpcs[0].VpcId" --output text)
if [ "$VPC" = "None" ] || [ -z "$VPC" ]; then
  echo "Hackathon_VPC not found in us-east-1. Is this the neatHack account? Stopping."; exit 1
fi
RUNNING=$(aws ec2 describe-instances --filters "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query "length(Reservations[].Instances[])" --output text)
if [ "$RUNNING" != "0" ]; then
  echo "An instance already exists ($RUNNING). The rules allow one per team; terminate it first. Stopping."; exit 1
fi

# A subnet in the VPC that gives public IPs (fall back to the first subnet).
SUBNET=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC" "Name=map-public-ip-on-launch,Values=true" \
  --query "Subnets[0].SubnetId" --output text)
[ "$SUBNET" = "None" ] && SUBNET=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC" --query "Subnets[0].SubnetId" --output text)

SG=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC" "Name=group-name,Values=$NAME-web" \
  --query "SecurityGroups[0].GroupId" --output text)
if [ "$SG" = "None" ]; then
  SG=$(aws ec2 create-security-group --group-name "$NAME-web" --description "Niyam web (80, 443)" --vpc-id "$VPC" --query GroupId --output text)
  for p in 80 443; do aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port $p --cidr 0.0.0.0/0 >/dev/null; done
  # EC2 Instance Connect from the AWS console (us-east-1 service range)
  aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 22 --cidr 18.206.107.24/29 >/dev/null
fi

AMI=$(aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
  --query Parameter.Value --output text)
curl -fsSL https://raw.githubusercontent.com/usv240/niyam/main/infra/bootstrap.sh -o /tmp/niyam-bootstrap.sh

ID=$(aws ec2 run-instances --image-id "$AMI" --instance-type t3.small --subnet-id "$SUBNET" --security-group-ids "$SG" \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
  --user-data file:///tmp/niyam-bootstrap.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME}]" \
  --query "Instances[0].InstanceId" --output text)
echo "Launched $ID. Waiting for it to start..."
aws ec2 wait instance-running --instance-ids "$ID"
IP=$(aws ec2 describe-instances --instance-ids "$ID" --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
echo
echo "Instance $ID is running at $IP."
echo "It needs about 8 minutes to install. Then, in the EC2 console: select '$NAME', Connect, EC2 Instance Connect, Connect, and run:"
echo "    sudo niyam-setup"
echo "Your site will be https://${IP//./-}.sslip.io"
