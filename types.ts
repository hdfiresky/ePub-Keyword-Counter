
/**
 * Defines the possible states of the application's processing workflow.
 * This is used to control UI elements like buttons, spinners, and status messages.
 */
export enum ProcessingState {
  IDLE = 'IDLE', // The initial state, waiting for user input.
  PROCESSING = 'PROCESSING', // The ePub file is being processed.
  SUCCESS = 'SUCCESS', // Processing finished successfully.
  ERROR = 'ERROR', // An error occurred during processing.
}
