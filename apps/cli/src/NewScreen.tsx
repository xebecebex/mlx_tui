#!/usr/bin/env node
import "dotenv/config";
import React from "react";
import { render } from "ink";

import { ChatScreen } from "./screens/ChatScreen.js";

render(<ChatScreen />);
