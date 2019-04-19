
# Low Erosivity Waiver (LEW)

## Continuous Build Status (by branch)

* Develop branch: [![CircleCI](https://circleci.com/gh/Eastern-Research-Group/lew/tree/develop.svg?style=svg&circle-token=fd2c6fd923415a86fb853f1886e28fce233aa771)](https://circleci.com/gh/Eastern-Research-Group/lew/tree/develop)
* Staging branch: [![CircleCI](https://circleci.com/gh/Eastern-Research-Group/lew/tree/staging.svg?style=svg&circle-token=fd2c6fd923415a86fb853f1886e28fce233aa771)](https://circleci.com/gh/Eastern-Research-Group/lew/tree/staging)

  
## Application locations (contact development team for user name / password)

 - **Production**
   - https://lew.epa.gov
   - https://lew-prod.app.cloud.gov  
 - **Staging**
   - https://lew-stage.app.cloud.gov
 - **Development**
   - https://lew-dev.app.cloud.gov
 - **Local**
   - http://localhost:9091
   
</br>

 - **Application Pages**
   - ***/*** (home page)
   - ***/api-docs*** (swagger user interface)
   - ***/sign_up_key.html*** (api.data.gov API key signup)
   
## Contribute

We currently use three Git based branches to support the project.

- develop = we use a feature branch strategy to submit code changes to this branch. Merges will be auto deployed to the Development environment.
- staging = Only a designated gatekeeper (e.g. Brad Cooper) for the project should issue pull requests from develop against staging. Merges will be auto deployed to the User Acceptance Testing environment.
- master = Only a designated gatekeeper for the project can issue pull requests from staging against master. The actual deployment mechanics for production is still TBD requiring NCC input.


**Instructions for contributing via Git:**

- Make sure you are on the Develop branch.

```
git checkout develop
```

- Make a new feature branch. Name it relative to the topic.

```
git checkout -b feature/your-branch-name
```

- You will now be in your new branch where you are free to make changes.
- To push those changes up, you'll need to add, commit, and push with the following commands:

```
git add .
git commit -m "describe your changes in these quotation marks"
git push origin feature/your-branch-name
```

- Then you can make a pull request by finding your branch on the
  [Github repository](https://github.com/Eastern-Research-Group/lew/branches)

***
![HMWv2 DevOps Pipeline](/docs/img/HMWv2%20DevOps%20Pipeline.png?raw=true "HMWv2 DevOps Pipeline")

## Local Development Environment Setup

- git clone this repo
- install Node.js from https://nodejs.org
- navigate to the app folder in the repo using the command line
  - run "npm install" from the command line to install packages from NPM
  - run "npm run start" from the command line to start a local web server to support development
  - run "npm test" from the command line to run the application's unit tests
