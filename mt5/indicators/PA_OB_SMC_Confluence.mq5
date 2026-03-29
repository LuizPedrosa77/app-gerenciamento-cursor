#property strict
#property indicator_chart_window
#property indicator_plots 2
#property indicator_buffers 2

#property indicator_label1 "Buy Signal"
#property indicator_type1 DRAW_ARROW
#property indicator_color1 clrLime
#property indicator_width1 1

#property indicator_label2 "Sell Signal"
#property indicator_type2 DRAW_ARROW
#property indicator_color2 clrTomato
#property indicator_width2 1

enum ENUM_STRUCTURE_EVENT
{
   STRUCT_EVENT_NONE = 0,
   STRUCT_EVENT_BOS  = 1,
   STRUCT_EVENT_CHOCH = 2
};

struct OBZone
{
   int id;
   int direction;          // 1 = bullish demand, -1 = bearish supply
   int obIndex;
   int createdIndex;
   int mitigatedIndex;
   double high;
   double low;
   bool mitigated;
   bool invalid;
   bool signaled;
};

input group "Structure"
input int    InpPivotLeftBars         = 3;
input int    InpPivotRightBars        = 3;
input double InpBreakTolerancePoints  = 5.0;
input double InpMinBreakBodyPoints    = 20.0;
input bool   InpShowStructureLabels   = true;

input group "Order Block"
input int    InpOBSearchBackBars      = 12;
input double InpMinDisplacementPoints = 80.0;
input int    InpMaxZoneAgeBars        = 80;

input group "Risk Management"
input double InpSLBufferPoints        = 10.0;
input double InpRiskReward            = 2.0;

input group "Rendering"
input bool   InpDrawObjects           = true;
input string InpObjectPrefix          = "PA_OB_SMC";
input color  InpBullZoneColor         = clrPaleGreen;
input color  InpBearZoneColor         = clrMistyRose;
input color  InpBullLabelColor        = clrLimeGreen;
input color  InpBearLabelColor        = clrIndianRed;
input color  InpSLColor               = clrOrangeRed;
input color  InpTPColor               = clrDeepSkyBlue;
input int    InpArrowOffsetPoints     = 20;
input int    InpLabelOffsetPoints     = 20;
input int    InpMaxHistoryBars        = 2500;

double BuySignalBuffer[];
double SellSignalBuffer[];

OBZone g_zones[];
int g_zoneCount = 0;
int g_nextZoneId = 1;
string g_prefix = "";

bool IsPivotHigh(const double &high[], const int rates_total, const int i, const int leftBars, const int rightBars)
{
   if(i + leftBars >= rates_total || i - rightBars < 0)
      return false;

   double pivot = high[i];
   for(int k = 1; k <= leftBars; k++)
   {
      if(high[i + k] >= pivot)
         return false;
   }
   for(int k = 1; k <= rightBars; k++)
   {
      if(high[i - k] > pivot)
         return false;
   }

   return true;
}

bool IsPivotLow(const double &low[], const int rates_total, const int i, const int leftBars, const int rightBars)
{
   if(i + leftBars >= rates_total || i - rightBars < 0)
      return false;

   double pivot = low[i];
   for(int k = 1; k <= leftBars; k++)
   {
      if(low[i + k] <= pivot)
         return false;
   }
   for(int k = 1; k <= rightBars; k++)
   {
      if(low[i - k] < pivot)
         return false;
   }

   return true;
}

int FindOpposingCandle(const double &open[], const double &close[], const int rates_total, const int breakIndex, const int direction, const int searchBackBars)
{
   int maxIdx = MathMin(rates_total - 1, breakIndex + searchBackBars);
   for(int j = breakIndex + 1; j <= maxIdx; j++)
   {
      bool opposite = (direction == 1) ? (close[j] < open[j]) : (close[j] > open[j]);
      if(opposite)
         return j;
   }
   return -1;
}

void ResetZones()
{
   g_zoneCount = 0;
   g_nextZoneId = 1;
   ArrayResize(g_zones, 0);
}

void AddZone(const int direction, const int obIndex, const int createdIndex, const double zoneHigh, const double zoneLow)
{
   int newSize = g_zoneCount + 1;
   ArrayResize(g_zones, newSize);

   OBZone z;
   z.id = g_nextZoneId++;
   z.direction = direction;
   z.obIndex = obIndex;
   z.createdIndex = createdIndex;
   z.mitigatedIndex = -1;
   z.high = zoneHigh;
   z.low = zoneLow;
   z.mitigated = false;
   z.invalid = false;
   z.signaled = false;

   g_zones[g_zoneCount] = z;
   g_zoneCount = newSize;
}

void DeleteObjectsByPrefix(const string prefix)
{
   int total = ObjectsTotal(0, 0, -1);
   for(int i = total - 1; i >= 0; i--)
   {
      string name = ObjectName(0, i, 0, -1);
      if(StringFind(name, prefix) == 0)
         ObjectDelete(0, name);
   }
}

void DrawZone(const OBZone &zone, const datetime &time[])
{
   if(!InpDrawObjects || zone.invalid)
      return;

   string name = g_prefix + "_OB_" + IntegerToString(zone.id);
   datetime t1 = time[zone.obIndex];
   datetime t2 = time[0];
   color zoneColor = (zone.direction == 1) ? InpBullZoneColor : InpBearZoneColor;

   ObjectCreate(0, name, OBJ_RECTANGLE, 0, t1, zone.high, t2, zone.low);
   ObjectSetInteger(0, name, OBJPROP_COLOR, zoneColor);
   ObjectSetInteger(0, name, OBJPROP_STYLE, STYLE_SOLID);
   ObjectSetInteger(0, name, OBJPROP_WIDTH, 1);
   ObjectSetInteger(0, name, OBJPROP_FILL, true);
   ObjectSetInteger(0, name, OBJPROP_BACK, true);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
}

void DrawStructureLabel(const int index, const datetime when, const double atPrice, const int direction, const ENUM_STRUCTURE_EVENT ev)
{
   if(!InpDrawObjects || !InpShowStructureLabels || ev == STRUCT_EVENT_NONE)
      return;

   string suffix = (ev == STRUCT_EVENT_BOS) ? "BOS" : "CHOCH";
   string text = suffix + ((direction == 1) ? " Bull" : " Bear");
   string name = g_prefix + "_STRUCT_" + IntegerToString(index) + "_" + text;

   ObjectCreate(0, name, OBJ_TEXT, 0, when, atPrice);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetInteger(0, name, OBJPROP_COLOR, (direction == 1) ? InpBullLabelColor : InpBearLabelColor);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 8);
   ObjectSetInteger(0, name, OBJPROP_ANCHOR, (direction == 1) ? ANCHOR_LOWER : ANCHOR_UPPER);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
}

void DrawPriceLevelLine(const string name, const datetime fromTime, const datetime toTime, const double price, const color col)
{
   ObjectCreate(0, name, OBJ_TREND, 0, fromTime, price, toTime, price);
   ObjectSetInteger(0, name, OBJPROP_COLOR, col);
   ObjectSetInteger(0, name, OBJPROP_STYLE, STYLE_SOLID);
   ObjectSetInteger(0, name, OBJPROP_WIDTH, 1);
   ObjectSetInteger(0, name, OBJPROP_RAY_RIGHT, false);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
}

void DrawSignalObjects(const int signalId, const int signalIndex, const int direction, const datetime &time[], const double entry, const double sl, const double tp)
{
   if(!InpDrawObjects)
      return;

   string base = g_prefix + "_SIG_" + IntegerToString(signalId) + "_" + IntegerToString(signalIndex);
   datetime t1 = time[signalIndex];
   datetime t2 = time[0];

   DrawPriceLevelLine(base + "_ENTRY", t1, t2, entry, clrSilver);
   DrawPriceLevelLine(base + "_SL", t1, t2, sl, InpSLColor);
   DrawPriceLevelLine(base + "_TP", t1, t2, tp, InpTPColor);

   string labelName = base + "_LABEL";
   string label = (direction == 1) ? "BUY RR " : "SELL RR ";
   label += DoubleToString(InpRiskReward, 2);
   ObjectCreate(0, labelName, OBJ_TEXT, 0, t1, entry);
   ObjectSetString(0, labelName, OBJPROP_TEXT, label);
   ObjectSetInteger(0, labelName, OBJPROP_COLOR, clrWhite);
   ObjectSetInteger(0, labelName, OBJPROP_FONTSIZE, 8);
   ObjectSetInteger(0, labelName, OBJPROP_ANCHOR, ANCHOR_LEFT_UPPER);
   ObjectSetInteger(0, labelName, OBJPROP_SELECTABLE, false);
}

int OnInit()
{
   SetIndexBuffer(0, BuySignalBuffer, INDICATOR_DATA);
   SetIndexBuffer(1, SellSignalBuffer, INDICATOR_DATA);

   PlotIndexSetInteger(0, PLOT_ARROW, 233);
   PlotIndexSetInteger(1, PLOT_ARROW, 234);
   PlotIndexSetDouble(0, PLOT_EMPTY_VALUE, EMPTY_VALUE);
   PlotIndexSetDouble(1, PLOT_EMPTY_VALUE, EMPTY_VALUE);

   IndicatorSetString(INDICATOR_SHORTNAME, "PA+OB SMC Confluence");

   g_prefix = InpObjectPrefix + "_" + _Symbol + "_" + EnumToString(_Period) + "_" + IntegerToString((int)ChartID());
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   DeleteObjectsByPrefix(g_prefix);
}

int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
{
   if(rates_total < (InpPivotLeftBars + InpPivotRightBars + 10))
      return 0;

   for(int i = 0; i < rates_total; i++)
   {
      BuySignalBuffer[i] = EMPTY_VALUE;
      SellSignalBuffer[i] = EMPTY_VALUE;
   }

   ResetZones();
   if(InpDrawObjects)
      DeleteObjectsByPrefix(g_prefix);

   int maxProcessIndex = MathMin(rates_total - 1 - InpPivotLeftBars, InpMaxHistoryBars);
   if(maxProcessIndex <= InpPivotRightBars + 2)
      return rates_total;

   int lastSwingHighIndex = -1;
   int lastSwingLowIndex = -1;
   double lastSwingHigh = 0.0;
   double lastSwingLow = 0.0;
   int trendDirection = 0; // 1 bullish, -1 bearish

   for(int i = maxProcessIndex; i >= 1; i--)
   {
      if(IsPivotHigh(high, rates_total, i, InpPivotLeftBars, InpPivotRightBars))
      {
         lastSwingHigh = high[i];
         lastSwingHighIndex = i;
      }
      if(IsPivotLow(low, rates_total, i, InpPivotLeftBars, InpPivotRightBars))
      {
         lastSwingLow = low[i];
         lastSwingLowIndex = i;
      }

      int structureDir = 0;
      ENUM_STRUCTURE_EVENT structureEvent = STRUCT_EVENT_NONE;

      bool breaksHigh = (lastSwingHighIndex != -1 && i < lastSwingHighIndex && close[i] > (lastSwingHigh + InpBreakTolerancePoints * _Point));
      bool breaksLow = (lastSwingLowIndex != -1 && i < lastSwingLowIndex && close[i] < (lastSwingLow - InpBreakTolerancePoints * _Point));

      if(breaksHigh && !breaksLow)
      {
         structureDir = 1;
         structureEvent = (trendDirection == 1) ? STRUCT_EVENT_BOS : STRUCT_EVENT_CHOCH;
         trendDirection = 1;
      }
      else if(breaksLow && !breaksHigh)
      {
         structureDir = -1;
         structureEvent = (trendDirection == -1) ? STRUCT_EVENT_BOS : STRUCT_EVENT_CHOCH;
         trendDirection = -1;
      }

      if(structureDir != 0)
      {
         int obIdx = FindOpposingCandle(open, close, rates_total, i, structureDir, InpOBSearchBackBars);
         if(obIdx != -1)
         {
            double displacementPts = MathAbs(close[i] - open[obIdx]) / _Point;
            double breakBodyPts = MathAbs(close[i] - open[i]) / _Point;
            if(displacementPts >= InpMinDisplacementPoints && breakBodyPts >= InpMinBreakBodyPoints)
               AddZone(structureDir, obIdx, i, high[obIdx], low[obIdx]);
         }

         double labelPrice = (structureDir == 1)
                             ? (high[i] + InpLabelOffsetPoints * _Point)
                             : (low[i] - InpLabelOffsetPoints * _Point);
         DrawStructureLabel(i, time[i], labelPrice, structureDir, structureEvent);
      }

      for(int z = 0; z < g_zoneCount; z++)
      {
         OBZone zone = g_zones[z];
         if(zone.invalid || zone.signaled)
            continue;

         int ageBars = zone.createdIndex - i;
         if(ageBars > InpMaxZoneAgeBars)
         {
            zone.invalid = true;
            g_zones[z] = zone;
            continue;
         }

         if(zone.direction == 1)
         {
            if(close[i] < (zone.low - InpBreakTolerancePoints * _Point))
            {
               zone.invalid = true;
               g_zones[z] = zone;
               continue;
            }
         }
         else
         {
            if(close[i] > (zone.high + InpBreakTolerancePoints * _Point))
            {
               zone.invalid = true;
               g_zones[z] = zone;
               continue;
            }
         }

         bool touched = (low[i] <= zone.high && high[i] >= zone.low);
         if(touched && !zone.mitigated)
         {
            zone.mitigated = true;
            zone.mitigatedIndex = i;
            g_zones[z] = zone;
         }

         if(zone.mitigated && structureDir == zone.direction && i <= zone.mitigatedIndex)
         {
            double entry = close[i];
            double sl = 0.0;
            double tp = 0.0;
            double risk = 0.0;
            bool validRisk = true;

            if(zone.direction == 1)
            {
               sl = zone.low - InpSLBufferPoints * _Point;
               risk = entry - sl;
               if(risk <= _Point)
                  validRisk = false;
               else
               {
                  tp = entry + (risk * InpRiskReward);
                  BuySignalBuffer[i] = low[i] - InpArrowOffsetPoints * _Point;
               }
            }
            else
            {
               sl = zone.high + InpSLBufferPoints * _Point;
               risk = sl - entry;
               if(risk <= _Point)
                  validRisk = false;
               else
               {
                  tp = entry - (risk * InpRiskReward);
                  SellSignalBuffer[i] = high[i] + InpArrowOffsetPoints * _Point;
               }
            }

            if(validRisk)
            {
               zone.signaled = true;
               zone.invalid = true;
               g_zones[z] = zone;
               DrawSignalObjects(zone.id, i, zone.direction, time, entry, sl, tp);
            }
         }
      }
   }

   for(int z = 0; z < g_zoneCount; z++)
      DrawZone(g_zones[z], time);

   return rates_total;
}
