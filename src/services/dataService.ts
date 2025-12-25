// import axios from "axios"
import { IGSStation } from "../types/types"
import igsNetwork from "@constants/IGSNetwork.json"

export const getDataIGS = (): Record<string, IGSStation> => {
  try {
    return igsNetwork as Record<string, IGSStation>;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch IGS data: ${error.message}`);
    }
    throw new Error('Unknown error occurred while fetching IGS data');
  }
};