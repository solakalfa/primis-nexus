# Primis.Nexus — Master Kit (v3)

This bundle contains governance docs, CI, and scripts. **Source of truth is Git.**

## Quickstart (Cloud Shell)
cd ~/ && mkdir -p primis.nexus && cd ~/primis.nexus
unzip -o ~/downloads/primis-nexus-master-kit-v3.zip -d .
git init && git add . && git commit -m "chore: bootstrap docs+ci"
# Add your repo later:
# git remote add origin <YOUR_REPO_URL> && git push -u origin master

## Daily
Update only `docs/project-journal.md`. Everything else syncs via PR/CI.
