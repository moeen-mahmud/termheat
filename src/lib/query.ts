export const CONTRIBUTIONS_QUERY = `
  query ($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;
