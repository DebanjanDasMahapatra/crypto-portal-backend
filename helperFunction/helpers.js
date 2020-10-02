const helpers = {
    flagRank : (contestInfo) => {
    let ct = new Date();
    let isFlag = new Date(contestInfo.startTime) < ct && new Date(contestInfo.endTime) > ct;
    let isRanklist = isFlag && contestInfo.rankList.show && (!contestInfo.rankList.automaticHide || (contestInfo.rankList.automaticHide && new Date(contestInfo.rankList.timeOfHide) > ct));
    return {isFlag, isRanklist}
    }
}

module.exports = helpers;